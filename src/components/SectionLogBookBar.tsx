import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  CheckSquare, 
  Square, 
  ExternalLink,
  RefreshCw,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { parseTasklist, toggleTasklistItem } from './notion/tasklist-utils';
import { 
  getNextPeriodSchedule, 
  normalizeCadence, 
  resetAllTasklistItems 
} from './notion/period-utils';

interface SectionLogBookBarProps {
  inspectorNik?: string | null;
  inspectorName?: string | null;
  onNav?: (tab: string) => void;
  className?: string;
}

interface LogbookTaskItem {
  id: string | number;
  title: string;
  description?: string | null;
  section?: string | null;
  priority?: string | null;
  status?: string | null;
  targetDate?: string | null;
  targetTime?: string | null;
  assigneeNik?: string | null;
  assigneeNiks?: string | null;
  picNik?: string | null;
  picName?: string | null;
  assigneeName?: string | null;
  assigneeNames?: string | null;
  progressPercent?: number | null;
}

export function SectionLogBookBar({
  inspectorNik,
  inspectorName,
  onNav,
  className = ''
}: SectionLogBookBarProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('section_logbook_expanded') === 'true';
    } catch {
      return false;
    }
  });

  const toggleExpanded = () => {
    setIsExpanded(prev => {
      const next = !prev;
      try {
        sessionStorage.setItem('section_logbook_expanded', String(next));
      } catch {}
      return next;
    });
  };

  const [tasks, setTasks] = useState<LogbookTaskItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());

  const toggleTaskExpand = (taskId: string | number) => {
    const sId = String(taskId);
    setExpandedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(sId)) {
        next.delete(sId);
      } else {
        next.add(sId);
      }
      return next;
    });
  };

  // Fetch PIC tasks
  const fetchPicTasks = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/logbook/tasks?date=${today}`);
      if (res.ok) {
        const json = await res.json();
        const rawList: LogbookTaskItem[] = [
          ...(json?.data?.todayTasks || []),
          ...(json?.data?.yesterdayTasks || []),
          ...(json?.data?.carryOverTasks || [])
        ];

        // Deduplicate by ID
        const seen = new Set<string>();
        const uniqueTasks: LogbookTaskItem[] = [];
        for (const t of rawList) {
          const sId = String(t.id);
          if (!seen.has(sId)) {
            seen.add(sId);
            uniqueTasks.push(t);
          }
        }

        // Filter tasks where current user is PIC
        const currentNik = String(inspectorNik || '').trim().toLowerCase();
        const currentName = String(inspectorName || '').trim().toLowerCase();

        const picTasks = uniqueTasks.filter(t => {
          if (!currentNik && !currentName) return false;
          
          const aNik = String(t.assigneeNik || '').trim().toLowerCase();
          const pNik = String(t.picNik || '').trim().toLowerCase();
          const aNiks = String(t.assigneeNiks || '').toLowerCase();
          const pName = String(t.picName || '').toLowerCase();
          const aNames = String(t.assigneeNames || '').toLowerCase();

          const matchNik = currentNik && (aNik === currentNik || pNik === currentNik || aNiks.includes(currentNik));
          const matchName = currentName && (
            (pName && (pName.includes(currentName) || currentName.includes(pName))) ||
            (aNames && (aNames.includes(currentName) || currentName.includes(aNames)))
          );

          return matchNik || matchName;
        });

        setTasks(picTasks);
      }
    } catch (err) {
      console.warn('Failed to load PIC logbook tasks:', err);
    } finally {
      setLoading(false);
      if (isManualRefresh) setIsRefreshing(false);
    }
  }, [inspectorNik, inspectorName]);

  useEffect(() => {
    fetchPicTasks();
  }, [fetchPicTasks]);

  // Open & on-progress tasks count
  const activeTasks = useMemo(() => {
    return tasks.filter(t => t.status !== 'Closed' && t.status !== 'Done' && t.status !== 'Resolved');
  }, [tasks]);

  // Toggle subtask checklist directly from homepage
  const handleToggleSubtask = async (task: LogbookTaskItem, itemIndex: number) => {
    const today = new Date().toISOString().split('T')[0];
    const prevDesc = task.description || '';
    const updatedDesc = toggleTasklistItem(prevDesc, itemIndex, today);
    const progress = parseTasklist(updatedDesc);

    let nextStatus = task.status;
    if (progress.hasTasklist && progress.total > 0) {
      if (progress.completed === 0) {
        nextStatus = 'Open';
      } else if (progress.completed === progress.total) {
        nextStatus = 'Closed';
      } else {
        nextStatus = 'On Progress';
      }
    }

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === task.id ? {
      ...t,
      description: updatedDesc,
      status: nextStatus,
      progressPercent: progress.percentage
    } : t));

    try {
      const res = await fetch(`/api/logbook/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: updatedDesc,
          status: nextStatus,
          progressPercent: progress.percentage,
          updaterNik: inspectorNik
        })
      });

      if (!res.ok) throw new Error('Gagal update log book');
      toast.success(nextStatus === 'Closed' ? 'Semua subtask selesai! Status: Closed' : 'Progres subtask diperbarui');

      // Jadwalkan otomatis periode selanjutnya jika tugas rutin diselesaikan
      if (nextStatus === 'Closed') {
        const actType = (task as any).activityType || 'Routine';
        const isRoutine = !actType.toLowerCase().includes('non');
        if (isRoutine) {
          const normCad = normalizeCadence(actType) || 'Daily';
          const curPeriod = (task as any).bulletinTopicTitle?.split(' - ')[1] || (normCad === 'Yearly' ? String(new Date().getFullYear()) : task.targetDate);
          const schedule = getNextPeriodSchedule(normCad, curPeriod, task.targetDate);
          const resetDesc = resetAllTasklistItems(updatedDesc);

          try {
            await fetch('/api/logbook/tasks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: task.title,
                description: resetDesc,
                section: task.section,
                assigneeNik: task.assigneeNik || task.picNik,
                assigneeName: task.assigneeName || task.picName,
                assignedByNik: inspectorNik || 'SUPERVISOR',
                assignedByName: inspectorName || 'Atasan / Manajemen',
                priority: task.priority || 'Normal',
                activityType: actType,
                taskDate: schedule.nextStartDate,
                plannedDate: schedule.nextStartDate,
                targetDate: schedule.nextTargetDate,
                targetTime: task.targetTime || '23:59',
                status: 'Open',
                progressPercent: 0,
                bulletinTopicTitle: task.title ? `${task.title} - ${schedule.nextPeriod}` : undefined
              })
            });
            toast.success(`🎉 Tugas periode baru (${schedule.nextPeriod}) dijadwalkan mulai ${schedule.nextStartDate}!`);
          } catch (rErr) {
            console.warn('Auto rollover next period error:', rErr);
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('Gagal memperbarui progres subtask');
      // Rollback
      fetchPicTasks();
    }
  };

  // Toggle whole task status if no subtasks
  const handleToggleWholeTask = async (task: LogbookTaskItem) => {
    const isDone = task.status === 'Closed' || task.status === 'Done';
    const nextStatus = isDone ? 'Open' : 'Closed';
    const nextPercent = isDone ? 0 : 100;

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === task.id ? {
      ...t,
      status: nextStatus,
      progressPercent: nextPercent
    } : t));

    try {
      const res = await fetch(`/api/logbook/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          progressPercent: nextPercent,
          updaterNik: inspectorNik
        })
      });

      if (!res.ok) throw new Error('Gagal update status task');
      toast.success(nextStatus === 'Closed' ? 'Tugas ditandai selesai!' : 'Tugas dibuka kembali');

      // Jadwalkan otomatis periode selanjutnya jika tugas rutin diselesaikan
      if (nextStatus === 'Closed') {
        const actType = (task as any).activityType || 'Routine';
        const isRoutine = !actType.toLowerCase().includes('non');
        if (isRoutine) {
          const normCad = normalizeCadence(actType) || 'Daily';
          const curPeriod = (task as any).bulletinTopicTitle?.split(' - ')[1] || (normCad === 'Yearly' ? String(new Date().getFullYear()) : task.targetDate);
          const schedule = getNextPeriodSchedule(normCad, curPeriod, task.targetDate);
          const resetDesc = resetAllTasklistItems(task.description || '');

          try {
            await fetch('/api/logbook/tasks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: task.title,
                description: resetDesc,
                section: task.section,
                assigneeNik: task.assigneeNik || task.picNik,
                assigneeName: task.assigneeName || task.picName,
                assignedByNik: inspectorNik || 'SUPERVISOR',
                assignedByName: inspectorName || 'Atasan / Manajemen',
                priority: task.priority || 'Normal',
                activityType: actType,
                taskDate: schedule.nextStartDate,
                plannedDate: schedule.nextStartDate,
                targetDate: schedule.nextTargetDate,
                targetTime: task.targetTime || '23:59',
                status: 'Open',
                progressPercent: 0,
                bulletinTopicTitle: task.title ? `${task.title} - ${schedule.nextPeriod}` : undefined
              })
            });
            toast.success(`🎉 Tugas periode baru (${schedule.nextPeriod}) dijadwalkan mulai ${schedule.nextStartDate}!`);
          } catch (rErr) {
            console.warn('Auto rollover next period error:', rErr);
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('Gagal memperbarui status tugas');
      fetchPicTasks();
    }
  };

  return (
    <div 
      className={`rounded-3xl border shadow-xs transition-all duration-200 overflow-hidden ${className}`}
      style={{
        backgroundColor: 'var(--card-bg, #FFFFFF)',
        borderColor: 'var(--border-main, #E2E8F0)'
      }}
    >
      {/* ── ACCORDION HEADER BAR ── */}
      <div 
        onClick={toggleExpanded}
        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/25 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs sm:text-sm font-display text-[var(--text-main,#0f172a)] tracking-tight">
                Section Log Book
              </h3>
              <span className="text-[10px] font-semibold text-[var(--text-muted,#64748b)] hidden sm:inline">
                ● Task PIC Saya
              </span>
            </div>
            <p className="text-[10.5px] text-[var(--text-muted,#64748b)] truncate">
              {activeTasks.length > 0 
                ? `${activeTasks.length} tugas aktif perlu dikerjakan` 
                : 'Semua tugas arahan PIC selesai'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
            activeTasks.length > 0
              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
          }`}>
            {activeTasks.length > 0 ? `${activeTasks.length} PIC Active` : 'Selesai'}
          </span>

          <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </div>
      </div>

      {/* ── ACCORDION EXPANDED CONTENT ── */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-[var(--border-main,#E2E8F0)] bg-[var(--input-bg,#F8FAFC)]/50 p-3.5 sm:p-4 space-y-3"
          >
            {/* Header info & shortcut */}
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-[11px] font-bold text-[var(--text-muted,#64748b)] flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                Daftar Arahan &amp; Checklist PIC
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchPicTasks(true);
                  }}
                  disabled={isRefreshing}
                  className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                  title="Segarkan data tugas"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
                {onNav && (
                  <button
                    type="button"
                    onClick={() => onNav('logbook')}
                    className="text-[10.5px] font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 flex items-center gap-1"
                  >
                    <span>Buka Log Book</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Task list */}
            {loading ? (
              <div className="py-6 text-center text-xs text-[var(--text-muted,#64748b)]">
                <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Memeriksa tugas PIC...
              </div>
            ) : tasks.length === 0 ? (
              <div className="py-6 text-center rounded-2xl bg-white dark:bg-slate-900 border border-[var(--border-main,#E2E8F0)] p-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-xs font-bold text-[var(--text-main,#0f172a)]">
                  Tidak Ada Tugas PIC yang Ditugaskan
                </p>
                <p className="text-[11px] text-[var(--text-muted,#64748b)] mt-0.5">
                  Anda tidak memiliki tanggung jawab tasklist tertunda di Section Log Book saat ini.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {tasks.map(task => {
                  const tasklist = parseTasklist(task.description || '');
                  const isDone = task.status === 'Closed' || task.status === 'Done';
                  const isTaskExpanded = expandedTaskIds.has(String(task.id));

                  return (
                    <div
                      key={task.id}
                      className={`p-3.5 rounded-2xl border transition-all duration-150 ${
                        isDone
                          ? 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-75'
                          : 'bg-white dark:bg-slate-900 border-[var(--border-main,#E2E8F0)] shadow-2xs hover:shadow-xs'
                      }`}
                    >
                      {/* Task Header */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          {/* Main Task Checkbox (if no subtasks) */}
                          {!tasklist.hasTasklist && (
                            <button
                              type="button"
                              onClick={() => handleToggleWholeTask(task)}
                              className="mt-0.5 text-teal-600 dark:text-teal-400 hover:scale-110 active:scale-95 transition-transform shrink-0"
                            >
                              {isDone ? (
                                <CheckSquare className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-400 hover:text-teal-600" />
                              )}
                            </button>
                          )}

                          <div 
                            className={`min-w-0 flex-1 ${tasklist.hasTasklist ? 'cursor-pointer select-none group/task' : ''}`}
                            onClick={() => {
                              if (tasklist.hasTasklist) {
                                toggleTaskExpand(task.id);
                              }
                            }}
                          >
                            <h4 className={`text-xs sm:text-sm font-bold leading-snug break-words transition-colors ${
                              isDone ? 'line-through text-slate-400' : 'text-[var(--text-main,#0f172a)]'
                            } ${tasklist.hasTasklist ? 'group-hover/task:text-teal-600 dark:group-hover/task:text-teal-400' : ''}`}>
                              {task.title}
                            </h4>

                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              {task.section && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  {task.section}
                                </span>
                              )}
                              {task.priority && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md border ${
                                  task.priority === 'Urgent' || task.priority === 'High'
                                    ? 'bg-rose-500/10 text-rose-600 border-rose-500/25'
                                    : 'bg-teal-500/10 text-teal-600 border-teal-500/25'
                                }`}>
                                  {task.priority}
                                </span>
                              )}
                              {task.targetDate && (
                                <span className="text-[9.5px] text-slate-400 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {task.targetDate}
                                </span>
                              )}

                              {/* Subtask Summary Pill Indicator */}
                              {tasklist.hasTasklist && (
                                <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/25 group-hover/task:bg-teal-500/20 transition-colors">
                                  <span>{tasklist.completed}/{tasklist.total} Subtask ({tasklist.percentage}%)</span>
                                  {isTaskExpanded ? (
                                    <ChevronUp className="w-3 h-3 text-teal-600" />
                                  ) : (
                                    <ChevronDown className="w-3 h-3 text-teal-600" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status badge & Chevron toggle */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                            isDone
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25'
                              : task.status === 'On Progress'
                                ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/25'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25'
                          }`}>
                            {task.status || 'Open'}
                          </span>

                          {tasklist.hasTasklist && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTaskExpand(task.id);
                              }}
                              className="p-1 rounded-md text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title={isTaskExpanded ? 'Tutup Checklist Subtask' : 'Buka Checklist Subtask'}
                            >
                              {isTaskExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Subtasks checklist: only visible when task is expanded */}
                      <AnimatePresence initial={false}>
                        {tasklist.hasTasklist && isTaskExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18, ease: 'easeOut' }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                              <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-muted,#64748b)] mb-1">
                                <span>Checklist Subtask ({tasklist.completed}/{tasklist.total})</span>
                                <span className="text-teal-600 dark:text-teal-400 font-extrabold">{tasklist.percentage}%</span>
                              </div>

                              <div className="space-y-1">
                                {tasklist.items.map((it) => (
                                  <label
                                    key={it.index}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleToggleSubtask(task, it.index);
                                    }}
                                    className={`flex items-start gap-2 p-1.5 rounded-lg text-xs cursor-pointer select-none transition-colors ${
                                      it.checked 
                                        ? 'bg-slate-50 dark:bg-slate-900/30 text-slate-400' 
                                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--text-main,#0f172a)]'
                                    }`}
                                  >
                                    <span className="mt-0.5 shrink-0 text-teal-600 dark:text-teal-400">
                                      {it.checked ? (
                                        <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                                      ) : (
                                        <Square className="w-3.5 h-3.5 text-slate-400" />
                                      )}
                                    </span>
                                    <span className={`text-[11.5px] leading-tight ${it.checked ? 'line-through text-slate-400' : ''}`}>
                                      {it.text}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
