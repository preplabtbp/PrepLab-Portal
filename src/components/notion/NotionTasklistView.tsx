import React from 'react';
import { CheckSquare, Square, CheckCircle2 } from 'lucide-react';
import { TasklistProgress } from './tasklist-utils';

interface NotionTasklistViewProps {
  progress: TasklistProgress;
  onToggleTask?: (taskIndex: number) => void;
  compact?: boolean;
  disabled?: boolean;
  hideProgressBar?: boolean;
}

export const NotionTasklistView: React.FC<NotionTasklistViewProps> = ({
  progress,
  onToggleTask,
  compact = false,
  disabled = false,
  hideProgressBar = false
}) => {
  if (!progress.hasTasklist) return null;

  const { total, completed, percentage, isAllCompleted, items } = progress;

  // Determine color theme based on percentage
  let progressColor = 'bg-teal-500';
  let badgeBorder = 'border-teal-500/40 text-teal-400 bg-teal-950/40';

  if (isAllCompleted) {
    progressColor = 'bg-emerald-500';
    badgeBorder = 'border-emerald-500/40 text-emerald-400 bg-emerald-950/40';
  } else if (percentage < 35) {
    progressColor = 'bg-amber-500';
    badgeBorder = 'border-amber-500/40 text-amber-400 bg-amber-950/40';
  } else if (percentage < 70) {
    progressColor = 'bg-sky-500';
    badgeBorder = 'border-sky-500/40 text-sky-400 bg-sky-950/40';
  }

  return (
    <div className="space-y-1.5 my-1 w-full max-w-sm">
      {/* Progress Header */}
      {!hideProgressBar && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
              <div
                className={`h-full transition-all duration-300 ${progressColor}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md font-semibold border ${badgeBorder}`}>
              {percentage}%
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {completed}/{total} {isAllCompleted ? 'Done' : 'Task'}
          </span>
        </div>
      )}

      {/* Task List Items */}
      <div className={`space-y-1 ${compact ? 'max-h-24 overflow-y-auto pr-1' : ''}`}>
        {items.map((item) => (
          <div
            key={item.index}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled && onToggleTask) {
                onToggleTask(item.index);
              }
            }}
            className={`flex items-start gap-1.5 text-xs select-none transition-colors rounded px-1 py-0.5 ${
              disabled ? 'cursor-default' : 'cursor-pointer hover:bg-slate-800/60'
            }`}
          >
            <button
              type="button"
              disabled={disabled}
              className="mt-0.5 shrink-0 focus:outline-none"
            >
              {item.checked ? (
                <CheckSquare className="w-3.5 h-3.5 text-teal-400 hover:text-teal-300" />
              ) : (
                <Square className="w-3.5 h-3.5 text-slate-400 hover:text-slate-300" />
              )}
            </button>
            <span
              className={`leading-snug text-left flex-1 break-words ${
                item.checked
                  ? 'line-through text-slate-500 dark:text-slate-500 font-normal'
                  : 'text-slate-200 dark:text-slate-200 font-medium'
              }`}
            >
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
