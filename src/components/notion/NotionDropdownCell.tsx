import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  ChevronDown, 
  Check, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

export type DropdownType = 'status' | 'activity' | 'priority' | 'period';

export interface DropdownOption {
  value: string;
  label: string;
  badgeClass: string;
  icon?: React.ReactNode;
}

export const STATUS_OPTIONS: DropdownOption[] = [
  {
    value: 'Open',
    label: 'Open',
    badgeClass: 'bg-blue-500/15 text-blue-500 dark:text-blue-400 border-blue-500/40 hover:bg-blue-500/25',
    icon: <Clock className="w-2.5 h-2.5 text-blue-500 dark:text-blue-400" />
  },
  {
    value: 'On Progress',
    label: 'On Progress',
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/25',
    icon: <RotateCcw className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
  },
  {
    value: 'Closed',
    label: 'Closed',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25',
    icon: <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
  },
  {
    value: 'Canceled',
    label: 'Canceled',
    badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40 hover:bg-rose-500/25',
    icon: <AlertCircle className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400" />
  }
];

const ACTIVITY_OPTIONS: DropdownOption[] = [
  {
    value: 'Routine',
    label: 'Routine',
    badgeClass: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/40 hover:bg-cyan-500/25'
  },
  {
    value: 'Non Routine',
    label: 'Non Routine',
    badgeClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/40 hover:bg-purple-500/25'
  },
  {
    value: 'Periodic',
    label: 'Periodic',
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/25'
  },
  {
    value: 'Special Task',
    label: 'Special Task',
    badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/40 hover:bg-rose-500/25'
  }
];

const PRIORITY_OPTIONS: DropdownOption[] = [
  {
    value: 'Low',
    label: 'Low',
    badgeClass: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/40 hover:bg-slate-500/25'
  },
  {
    value: 'Normal',
    label: 'Normal',
    badgeClass: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/40 hover:bg-teal-500/25'
  },
  {
    value: 'Medium',
    label: 'Medium',
    badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/40 hover:bg-blue-500/25'
  },
  {
    value: 'High',
    label: 'High',
    badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/25',
    icon: <AlertTriangle className="w-2.5 h-2.5 text-amber-500 dark:text-amber-400" />
  },
  {
    value: 'Urgent',
    label: 'Urgent',
    badgeClass: 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/50 hover:bg-rose-500/30 font-bold',
    icon: <AlertCircle className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400" />
  }
];

const PERIOD_OPTIONS: DropdownOption[] = [
  { value: 'Daily', label: 'Daily', badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700' },
  { value: 'Weekly', label: 'Weekly', badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700' },
  { value: 'Monthly', label: 'Monthly', badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700' },
  { value: 'Quarterly', label: 'Quarterly', badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700' },
  { value: 'Yearly', label: 'Yearly', badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700' },
  { value: 'Ad-hoc', label: 'Ad-hoc', badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700' }
];

interface NotionDropdownCellProps {
  type: DropdownType;
  value: string;
  onChange: (newValue: string) => void;
  compact?: boolean;
  optionsOverride?: DropdownOption[];
}

export const NotionDropdownCell: React.FC<NotionDropdownCellProps> = ({
  type,
  value,
  onChange,
  compact = false,
  optionsOverride
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; openUpwards: boolean } | null>(null);

  const options = 
    optionsOverride ||
    (type === 'status' ? STATUS_OPTIONS :
    type === 'activity' ? ACTIVITY_OPTIONS :
    type === 'priority' ? PRIORITY_OPTIONS : PERIOD_OPTIONS);

  // Find matching option or fallback
  const currentValLower = (value || '').toLowerCase().trim();
  let currentOpt = options.find(
    o => o.value.toLowerCase() === currentValLower || o.label.toLowerCase() === currentValLower
  );

  if (!currentOpt && type === 'status') {
    if (currentValLower.includes('progress') || currentValLower.includes('proses')) {
      currentOpt = options.find(o => o.value === 'On Progress');
    } else if (currentValLower.includes('close') || currentValLower.includes('selesai') || currentValLower.includes('done') || currentValLower.includes('resolved')) {
      currentOpt = options.find(o => o.value === 'Closed');
    } else if (currentValLower.includes('cancel') || currentValLower.includes('batal')) {
      currentOpt = options.find(o => o.value === 'Canceled');
    } else if (currentValLower.includes('open') || currentValLower.includes('baru')) {
      currentOpt = options.find(o => o.value === 'Open');
    }
  }

  if (!currentOpt) {
    currentOpt = {
      value: value || '-',
      label: value || '-',
      badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-500/20'
    };
  }

  // Update fixed portal position based on button coordinates
  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const anticipatedMenuHeight = 240;
    const openUpwards = (rect.bottom + anticipatedMenuHeight) > window.innerHeight && rect.top > anticipatedMenuHeight;

    setPosition({
      top: openUpwards ? (rect.top - 6) : (rect.bottom + 6),
      left: Math.max(8, Math.min(window.innerWidth - 170, rect.left)),
      openUpwards
    });
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Close dropdown on outside click or window resize/scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
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

  const handleSelect = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className="inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        title="Klik untuk ubah langsung"
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium transition-all group/btn cursor-pointer ${currentOpt.badgeClass} ${
          compact ? 'text-[10px] px-1.5 py-0.2' : ''
        }`}
      >
        {currentOpt.icon}
        <span className="truncate max-w-[120px]">{currentOpt.label}</span>
        <ChevronDown className="w-2.5 h-2.5 opacity-60 group-hover/btn:opacity-100 group-hover/btn:translate-y-0.2 transition-all shrink-0" />
      </button>

      {/* Popover Menu Rendered in Body via React Portal (Never Covered by Sibling Rows, 100% Solid) */}
      {isOpen && position && createPortal(
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          className="fixed rounded-xl border p-1 font-sans animate-in fade-in zoom-in-95 duration-100"
          style={{
            top: position.openUpwards ? undefined : `${position.top}px`,
            bottom: position.openUpwards ? `${window.innerHeight - position.top}px` : undefined,
            left: `${position.left}px`,
            minWidth: '150px',
            maxWidth: '220px',
            zIndex: 99999,
            backgroundColor: 'var(--card-bg, #ffffff)',
            borderColor: 'var(--border-main, #cbd5e1)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.15)'
          }}
        >
          {/* Header Title */}
          <div 
            className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider border-b mb-1 font-bold"
            style={{
              borderColor: 'var(--border-main, #e2e8f0)',
              color: 'var(--text-muted, #64748b)'
            }}
          >
            Pilih {type}
          </div>

          {/* Options List */}
          <div className="space-y-0.5">
            {options.map((opt) => {
              const isSelected = opt.value.toLowerCase() === currentValLower;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={(e) => handleSelect(opt.value, e)}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                    isSelected 
                      ? 'bg-teal-500/15 text-teal-600 dark:text-teal-300 font-bold' 
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  style={{
                    color: isSelected ? undefined : 'var(--text-main, #0f172a)'
                  }}
                >
                  <div className="flex items-center gap-2">
                    {opt.icon}
                    <span className="font-medium">{opt.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
