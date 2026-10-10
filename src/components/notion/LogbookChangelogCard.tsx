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
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  TableRowData, 
  buildLogbookChangelogData, 
  generateLogbookChangelogWhatsappText,
  formatToDDMMYYYY 
} from './logbook-section-utils';

interface LogbookChangelogCardProps {
  sectionName: string;
  allRows: TableRowData[];
  generalNotes?: Record<string, string>;
  onCarryOverTask?: (rawRow: TableRowData) => void;
  onViewRawTable?: () => void;
  isNotionLight?: boolean;
}

export const LogbookChangelogCard: React.FC<LogbookChangelogCardProps> = ({
  sectionName,
  allRows,
  generalNotes = {},
  onCarryOverTask,
  onViewRawTable,
  isNotionLight = true
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Compute changelog data from yesterday's rows
  const changelog = useMemo(() => {
    return buildLogbookChangelogData(allRows);
  }, [allRows]);

  const yesterdayGeneralNote = generalNotes[changelog.dateStr] || '';

  // Copy to WhatsApp handler
  const handleCopyWhatsapp = () => {
    try {
      const text = generateLogbookChangelogWhatsappText({
        sectionName,
        dateStr: changelog.dateStr,
        generalNote: yesterdayGeneralNote,
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

  // If there are no historical tasks at all
  if (changelog.totalTasks === 0 && !yesterdayGeneralNote) {
    return (
      <div 
        className="mb-4 p-4 rounded-xl border border-dashed text-xs flex items-center justify-between"
        style={{
          backgroundColor: isNotionLight ? '#f8fafc' : '#1e293b',
          borderColor: isNotionLight ? '#cbd5e1' : '#334155',
          color: isNotionLight ? '#64748b' : '#94a3b8'
        }}
      >
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-slate-400" />
          <span>
            <strong>Report Progress Kemarin:</strong> Belum ada riwayat aktivitas tanggal kemarin yang tersimpan. Mulai buat rencana kerja hari ini di tabel bawah.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="mb-5 rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs"
      style={{
        backgroundColor: isNotionLight ? '#ffffff' : '#1e1e1e',
        borderColor: isNotionLight ? '#e2e8f0' : '#2d3748'
      }}
    >
      {/* Top Header Bar */}
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
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm tracking-tight" style={{ color: isNotionLight ? '#0f172a' : '#f8fafc' }}>
                Report Progress Kemarin
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-slate-200/60 dark:bg-slate-700/60 font-semibold" style={{ color: isNotionLight ? '#334155' : '#cbd5e1' }}>
                {changelog.dateStr}
              </span>
            </div>
            <p className="text-[11px]" style={{ color: isNotionLight ? '#64748b' : '#94a3b8' }}>
              Changelog eksekutif hasil pengerjaan tim seksi {sectionName}
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
              title="Lihat tabel mentah kemarin"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tabel Detail</span>
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

      {/* Main Body (Collapsible) */}
      {!isCollapsed && (
        <div className="p-4 space-y-4 text-xs">
          {/* General Notes / Site Highlights if available */}
          {yesterdayGeneralNote && yesterdayGeneralNote.trim() && (
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
                  {yesterdayGeneralNote}
                </div>
              </div>
            </div>
          )}

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
                Tidak ada kegiatan yang berstatus Closed kemarin.
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

                          {/* Subtasks summary if available */}
                          {task.subtasks.length > 0 && (
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                              <span>✓ {task.completedSubtasks}/{task.totalSubtasks} Subtask selesai [100%]</span>
                            </div>
                          )}

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
                🎉 Luar biasa! Seluruh target kemarin telah tuntas 100%.
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
                          onClick={() => onCarryOverTask(task.rawRow)}
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
        </div>
      )}
    </div>
  );
};
