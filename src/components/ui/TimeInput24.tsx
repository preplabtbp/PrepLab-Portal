import React, { useState, useRef, useEffect } from 'react';
import { Clock, Check } from 'lucide-react';
import { HOURS_24, MINUTES_STEP_5, getCurrentTime24, normalizeTime24 } from '../../utils/time24';

export interface TimeInput24Props {
  value?: string; // 'HH:mm' format (00:00 - 23:59)
  onChange: (value: string) => void;
  className?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  label?: string;
  showNowButton?: boolean;
  style?: React.CSSProperties;
}

export function TimeInput24({
  value = '09:00',
  onChange,
  className = '',
  id,
  name,
  disabled = false,
  required = false,
  placeholder = 'HH:mm',
  label,
  showNowButton = true,
  style
}: TimeInput24Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse current hour & minute
  const safeValue = value && value.includes(':') ? value : '09:00';
  const [currentH, currentM] = safeValue.split(':');
  const selectedHour = (currentH || '09').padStart(2, '0');
  const selectedMinute = (currentM || '00').padStart(2, '0');

  // Local text input state for seamless typing
  const [typedValue, setTypedValue] = useState(safeValue);

  useEffect(() => {
    setTypedValue(safeValue);
  }, [safeValue]);

  // Click outside to close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^\d:]/g, '');

    // Auto-insert ':' when user types 2 digits
    if (raw.length === 2 && !raw.includes(':') && typedValue.length < 2) {
      const hNum = parseInt(raw, 10);
      if (hNum > 23) raw = '23';
      raw = `${raw}:`;
    }

    setTypedValue(raw);

    // If matches complete format HH:mm
    if (/^\d{2}:\d{2}$/.test(raw)) {
      const [hStr, mStr] = raw.split(':');
      let h = parseInt(hStr, 10);
      let m = parseInt(mStr, 10);
      if (h > 23) h = 23;
      if (m > 59) m = 59;
      const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      onChange(formatted);
    }
  };

  const handleInputBlur = () => {
    if (typedValue) {
      const normalized = normalizeTime24(typedValue);
      if (normalized && normalized.includes(':')) {
        onChange(normalized);
        setTypedValue(normalized);
      } else {
        setTypedValue(safeValue);
      }
    } else {
      setTypedValue(safeValue);
    }
  };

  const selectHour = (h: string) => {
    const newTime = `${h}:${selectedMinute}`;
    onChange(newTime);
  };

  const selectMinute = (m: string) => {
    const newTime = `${selectedHour}:${m}`;
    onChange(newTime);
  };

  const handleSetNow = () => {
    const nowTime = getCurrentTime24();
    onChange(nowTime);
    setTypedValue(nowTime);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="block text-[11px] font-extrabold text-slate-600 dark:text-slate-400 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          id={id}
          name={name}
          disabled={disabled}
          required={required}
          value={typedValue}
          placeholder={placeholder}
          maxLength={5}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onClick={() => !disabled && setIsOpen(true)}
          className={`w-full pl-9 pr-8 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-teal-500 shadow-2xs tracking-wider ${className}`}
          style={style}
        />

        {/* Left Clock Icon */}
        <div 
          onClick={() => !disabled && setIsOpen(prev => !prev)}
          className="absolute left-2.5 flex items-center justify-center text-teal-600 dark:text-teal-400 cursor-pointer pointer-events-auto"
          title="Buka pemilih waktu 24 jam"
        >
          <Clock className="w-4 h-4" />
        </div>

        {/* Right 24h Badge */}
        <button
          type="button"
          tabIndex={-1}
          onClick={() => !disabled && setIsOpen(prev => !prev)}
          className="absolute right-2 px-1 py-0.5 text-[9px] font-black uppercase tracking-tight rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 hover:text-teal-700 transition-colors cursor-pointer"
          title="Format 24 Jam"
        >
          24H
        </button>
      </div>

      {/* 24-Hour Interactive Popover */}
      {isOpen && !disabled && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-3 animate-in fade-in zoom-in-95 duration-150">
          {/* Header & Quick Action */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Waktu 24 Jam
              </span>
            </div>
            {showNowButton && (
              <button
                type="button"
                onClick={handleSetNow}
                className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 hover:bg-teal-500/20 transition-colors cursor-pointer"
              >
                Sekarang ({getCurrentTime24()})
              </button>
            )}
          </div>

          {/* Time Picker Columns */}
          <div className="grid grid-cols-2 gap-2 text-center">
            {/* Hours Column (00-23) */}
            <div>
              <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Jam (00 - 23)
              </div>
              <div className="max-h-44 overflow-y-auto custom-scrollbar pr-1 grid grid-cols-3 gap-1">
                {HOURS_24.map(h => {
                  const isSelected = h === selectedHour;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => selectHour(h)}
                      className={`py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-teal-600 text-white shadow-xs scale-105'
                          : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-600'
                      }`}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minutes Column (00-55) */}
            <div>
              <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                Menit (00 - 55)
              </div>
              <div className="max-h-44 overflow-y-auto custom-scrollbar pr-1 grid grid-cols-2 gap-1">
                {MINUTES_STEP_5.map(m => {
                  const isSelected = m === selectedMinute;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => selectMinute(m)}
                      className={`py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-teal-600 text-white shadow-xs scale-105'
                          : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-600'
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Preview & Done */}
          <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-mono font-black text-slate-800 dark:text-slate-200">
              Terpilih: <span className="text-teal-600 dark:text-teal-400 text-sm">{selectedHour}:{selectedMinute}</span>
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Check className="w-3 h-3" /> Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
