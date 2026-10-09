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
  badgeClass?: string;
  bgColor?: string;
  textColor?: string;
  icon?: React.ReactNode;
}

export const STATUS_OPTIONS: DropdownOption[] = [
  {
    value: 'Open',
    label: 'OPEN',
    bgColor: '#E3E2E0',
    textColor: '#5A5A58',
    icon: <Clock className="w-2.5 h-2.5" style={{ color: '#5A5A58' }} />
  },
  {
    value: 'On Progress',
    label: 'ON PROGRESS',
    bgColor: '#FDECC8',
    textColor: '#8F6B12',
    icon: <RotateCcw className="w-2.5 h-2.5" style={{ color: '#8F6B12' }} />
  },
  {
    value: 'Closed',
    label: 'CLOSE',
    bgColor: '#D3E5EF',
    textColor: '#235A80',
    icon: <CheckCircle2 className="w-2.5 h-2.5" style={{ color: '#235A80' }} />
  },
  {
    value: 'Close',
    label: 'CLOSE',
    bgColor: '#D3E5EF',
    textColor: '#235A80',
    icon: <CheckCircle2 className="w-2.5 h-2.5" style={{ color: '#235A80' }} />
  },
  {
    value: 'Done',
    label: 'DONE',
    bgColor: '#DBEDDB',
    textColor: '#286641',
    icon: <Check className="w-2.5 h-2.5" style={{ color: '#286641' }} />
  },
  {
    value: 'Canceled',
    label: 'CANCELED',
    bgColor: '#FFE2DD',
    textColor: '#9B3E37',
    icon: <AlertCircle className="w-2.5 h-2.5" style={{ color: '#9B3E37' }} />
  },
  {
    value: 'Pending',
    label: 'PENDING',
    bgColor: '#E8DEEE',
    textColor: '#6940A5',
    icon: <AlertCircle className="w-2.5 h-2.5" style={{ color: '#6940A5' }} />
  }
];

export const ROUTINE_CADENCE_OPTIONS: DropdownOption[] = [
  {
    value: 'Daily',
    label: 'DAILY',
    bgColor: '#DBEDDB',
    textColor: '#286641'
  },
  {
    value: 'Weekly',
    label: 'WEEKLY',
    bgColor: '#D3E5EF',
    textColor: '#235A80'
  },
  {
    value: 'Monthly',
    label: 'MONTHLY',
    bgColor: '#E8DEEE',
    textColor: '#6940A5'
  },
  {
    value: 'Quarterly',
    label: 'QUARTERLY',
    bgColor: '#F5E0E9',
    textColor: '#96386C'
  },
  {
    value: 'Biannual',
    label: 'BIANNUAL',
    bgColor: '#FDECC8',
    textColor: '#8F6B12'
  },
  {
    value: 'Yearly',
    label: 'YEARLY',
    bgColor: '#FFE2DD',
    textColor: '#9B3E37'
  }
];

const ACTIVITY_OPTIONS: DropdownOption[] = [
  ...ROUTINE_CADENCE_OPTIONS,
  {
    value: 'Non Routine',
    label: 'NON ROUTINE',
    bgColor: '#E3E2E0',
    textColor: '#5A5A58'
  }
];

const PRIORITY_OPTIONS: DropdownOption[] = [
  {
    value: 'Low',
    label: 'LOW',
    bgColor: '#E3E2E0',
    textColor: '#5A5A58'
  },
  {
    value: 'Normal',
    label: 'NORMAL',
    bgColor: '#D3E5EF',
    textColor: '#235A80'
  },
  {
    value: 'Medium',
    label: 'MEDIUM',
    bgColor: '#FDECC8',
    textColor: '#8F6B12'
  },
  {
    value: 'High',
    label: 'HIGH',
    bgColor: '#FADEC9',
    textColor: '#9A5826',
    icon: <AlertTriangle className="w-2.5 h-2.5" style={{ color: '#9A5826' }} />
  },
  {
    value: 'Urgent',
    label: 'URGENT',
    bgColor: '#FFE2DD',
    textColor: '#9B3E37',
    icon: <AlertCircle className="w-2.5 h-2.5" style={{ color: '#9B3E37' }} />
  }
];

const PERIOD_OPTIONS: DropdownOption[] = [
  { value: 'Daily', label: 'DAILY', bgColor: '#DBEDDB', textColor: '#286641' },
  { value: 'Weekly', label: 'WEEKLY', bgColor: '#D3E5EF', textColor: '#235A80' },
  { value: 'Monthly', label: 'MONTHLY', bgColor: '#E8DEEE', textColor: '#6940A5' },
  { value: 'Quarterly', label: 'QUARTERLY', bgColor: '#F5E0E9', textColor: '#96386C' },
  { value: 'Biannual', label: 'BIANNUAL', bgColor: '#FDECC8', textColor: '#8F6B12' },
  { value: 'Yearly', label: 'YEARLY', bgColor: '#FFE2DD', textColor: '#9B3E37' },
  { value: 'Non-Routine', label: 'NON-ROUTINE', bgColor: '#E3E2E0', textColor: '#5A5A58' },
  { value: 'Ad-hoc', label: 'AD-HOC', bgColor: '#E3E2E0', textColor: '#5A5A58' }
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
  const [isRoutineExpanded, setIsRoutineExpanded] = useState(true);
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
      label: (value || '-').toUpperCase(),
      bgColor: '#E3E2E0',
      textColor: '#5A5A58'
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
        style={{
          backgroundColor: currentOpt.bgColor,
          color: currentOpt.textColor
        }}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold tracking-wide uppercase select-none transition-opacity hover:opacity-90 cursor-pointer shadow-2xs ${
          compact ? 'text-[11px] px-1.5 py-0.5' : ''
        }`}
      >
        {currentOpt.icon}
        <span className="truncate max-w-[120px]">
          {(type === 'activity' || type === 'period') ? currentOpt.label.replace(/\s*\([^)]*\)/g, '').trim() : currentOpt.label}
        </span>
        <ChevronDown className="w-2.5 h-2.5 opacity-70 group-hover/btn:opacity-100 group-hover/btn:translate-y-0.2 transition-all shrink-0" style={{ color: currentOpt.textColor }} />
      </button>

      {/* Popover Menu Rendered in Body via React Portal (Never Covered by Sibling Rows, 100% Solid) */}
      {isOpen && position && createPortal(
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          className="fixed rounded-xl border p-1.5 font-sans animate-in fade-in zoom-in-95 duration-100 bg-white border-slate-200 shadow-xl"
          style={{
            top: position.openUpwards ? undefined : `${position.top}px`,
            bottom: position.openUpwards ? `${window.innerHeight - position.top}px` : undefined,
            left: `${position.left}px`,
            minWidth: '160px',
            maxWidth: '240px',
            zIndex: 99999,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
          }}
        >
          {/* Header Title */}
          <div 
            className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider border-b mb-1 font-bold text-slate-500 border-slate-100"
          >
            Pilih {type}
          </div>

          {/* Options List */}
          <div className="space-y-0.5">
            {type === 'activity' ? (
              <>
                {/* Choice 1: Routine (with expand/collapse for cadences Daily - Yearly) */}
                <div className="rounded-lg border border-slate-100 overflow-hidden">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsRoutineExpanded(!isRoutineExpanded);
                    }}
                    className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-left text-xs transition-colors cursor-pointer hover:bg-slate-50 text-slate-700 font-semibold"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                      <span>Routine (Rutin)</span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isRoutineExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Expanded Cadence Options (Daily s/d Yearly) */}
                  {isRoutineExpanded && (
                    <div className="bg-slate-50/60 p-1 space-y-0.5 border-t border-slate-100">
                      {ROUTINE_CADENCE_OPTIONS.map((opt) => {
                        const isSelected = opt.value.toLowerCase() === currentValLower;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={(e) => handleSelect(opt.value, e)}
                            className="w-full flex items-center justify-between gap-2 px-2 py-1 rounded text-left text-xs transition-colors cursor-pointer hover:bg-slate-100"
                          >
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase select-none"
                              style={{
                                backgroundColor: opt.bgColor,
                                color: opt.textColor
                              }}
                            >
                              {opt.label}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-slate-700 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Choice 2: Non Routine (Insidentil) */}
                {(() => {
                  const isSelected = currentValLower.includes('non');
                  return (
                    <button
                      type="button"
                      onClick={(e) => handleSelect('Non Routine', e)}
                      className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer hover:bg-slate-50"
                    >
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase select-none"
                        style={{
                          backgroundColor: '#E3E2E0',
                          color: '#5A5A58'
                        }}
                      >
                        NON ROUTINE
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-slate-700 shrink-0" />}
                    </button>
                  );
                })()}
              </>
            ) : (
              options.map((opt) => {
                const isSelected = opt.value.toLowerCase() === currentValLower;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={(e) => handleSelect(opt.value, e)}
                    className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase select-none"
                        style={{
                          backgroundColor: opt.bgColor || '#E3E2E0',
                          color: opt.textColor || '#5A5A58'
                        }}
                      >
                        {opt.icon}
                        <span>{opt.label}</span>
                      </span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-slate-700 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
