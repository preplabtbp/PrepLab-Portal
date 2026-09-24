import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronDown, 
  Check, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw,
  Sparkles
} from 'lucide-react';

export type DropdownType = 'status' | 'activity' | 'priority' | 'period';

interface DropdownOption {
  value: string;
  label: string;
  badgeClass: string;
  icon?: React.ReactNode;
}

const STATUS_OPTIONS: DropdownOption[] = [
  {
    value: 'Open',
    label: 'Open',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/40 hover:bg-blue-500/25',
    icon: <Clock className="w-2.5 h-2.5 text-blue-400" />
  },
  {
    value: 'In Progress',
    label: 'In Progress',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/40 hover:bg-amber-500/25',
    icon: <RotateCcw className="w-2.5 h-2.5 text-amber-400 animate-spin-slow" />
  },
  {
    value: 'Resolved',
    label: 'Resolved',
    badgeClass: 'bg-teal-500/15 text-teal-400 border-teal-500/40 hover:bg-teal-500/25',
    icon: <CheckCircle2 className="w-2.5 h-2.5 text-teal-400" />
  },
  {
    value: 'Closed',
    label: 'Closed',
    badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/40 hover:bg-purple-500/25',
    icon: <Check className="w-2.5 h-2.5 text-purple-400" />
  },
  {
    value: 'Done',
    label: 'Done',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25',
    icon: <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
  },
  {
    value: 'Cancelled',
    label: 'Cancelled',
    badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/40 hover:bg-rose-500/25',
    icon: <AlertCircle className="w-2.5 h-2.5 text-rose-400" />
  }
];

const ACTIVITY_OPTIONS: DropdownOption[] = [
  {
    value: 'Routine',
    label: 'Routine',
    badgeClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/40 hover:bg-cyan-500/25'
  },
  {
    value: 'Non Routine',
    label: 'Non Routine',
    badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/40 hover:bg-purple-500/25'
  },
  {
    value: 'Periodic',
    label: 'Periodic',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/40 hover:bg-amber-500/25'
  },
  {
    value: 'Special Task',
    label: 'Special Task',
    badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/40 hover:bg-rose-500/25'
  }
];

const PRIORITY_OPTIONS: DropdownOption[] = [
  {
    value: 'Low',
    label: 'Low',
    badgeClass: 'bg-slate-500/15 text-slate-400 border-slate-500/40 hover:bg-slate-500/25'
  },
  {
    value: 'Normal',
    label: 'Normal',
    badgeClass: 'bg-teal-500/15 text-teal-400 border-teal-500/40 hover:bg-teal-500/25'
  },
  {
    value: 'Medium',
    label: 'Medium',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/40 hover:bg-blue-500/25'
  },
  {
    value: 'High',
    label: 'High',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/40 hover:bg-amber-500/25',
    icon: <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
  },
  {
    value: 'Urgent',
    label: 'Urgent',
    badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/50 hover:bg-rose-500/30 animate-pulse',
    icon: <AlertCircle className="w-2.5 h-2.5 text-rose-400" />
  }
];

const PERIOD_OPTIONS: DropdownOption[] = [
  { value: 'Daily', label: 'Daily', badgeClass: 'bg-slate-800 text-slate-300 border-slate-700' },
  { value: 'Weekly', label: 'Weekly', badgeClass: 'bg-slate-800 text-slate-300 border-slate-700' },
  { value: 'Monthly', label: 'Monthly', badgeClass: 'bg-slate-800 text-slate-300 border-slate-700' },
  { value: 'Quarterly', label: 'Quarterly', badgeClass: 'bg-slate-800 text-slate-300 border-slate-700' },
  { value: 'Yearly', label: 'Yearly', badgeClass: 'bg-slate-800 text-slate-300 border-slate-700' },
  { value: 'Ad-hoc', label: 'Ad-hoc', badgeClass: 'bg-slate-800 text-slate-300 border-slate-700' }
];

interface NotionDropdownCellProps {
  type: DropdownType;
  value: string;
  onChange: (newValue: string) => void;
  compact?: boolean;
}

export const NotionDropdownCell: React.FC<NotionDropdownCellProps> = ({
  type,
  value,
  onChange,
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const options = 
    type === 'status' ? STATUS_OPTIONS :
    type === 'activity' ? ACTIVITY_OPTIONS :
    type === 'priority' ? PRIORITY_OPTIONS : PERIOD_OPTIONS;

  // Find matching option or fallback
  const currentValLower = (value || '').toLowerCase().trim();
  const currentOpt = options.find(
    o => o.value.toLowerCase() === currentValLower || o.label.toLowerCase() === currentValLower
  ) || {
    value: value || '-',
    label: value || '-',
    badgeClass: 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-800'
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        title="Klik untuk ubah langsung"
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium transition-all group/btn cursor-pointer ${currentOpt.badgeClass} ${
          compact ? 'text-[10px] px-1.5 py-0.2' : ''
        }`}
      >
        {currentOpt.icon}
        <span className="truncate max-w-[120px]">{currentOpt.label}</span>
        <ChevronDown className="w-2.5 h-2.5 opacity-60 group-hover/btn:opacity-100 group-hover/btn:translate-y-0.2 transition-all shrink-0" />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 mt-1 min-w-[140px] rounded-xl shadow-2xl border p-1 bg-slate-900 border-slate-700/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 font-sans"
          style={{
            backgroundColor: 'var(--card-bg, #1a1a1a)',
            borderColor: 'var(--border-main, #334155)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
          }}
        >
          <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-800 mb-1">
            Pilih {type}
          </div>
          <div className="space-y-0.5">
            {options.map((opt) => {
              const isSelected = opt.value.toLowerCase() === currentValLower;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={(e) => handleSelect(opt.value, e)}
                  className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                    isSelected ? 'bg-teal-500/20 text-teal-300 font-semibold' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {opt.icon}
                    <span>{opt.label}</span>
                  </div>
                  {isSelected && <Check className="w-3 h-3 text-teal-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
