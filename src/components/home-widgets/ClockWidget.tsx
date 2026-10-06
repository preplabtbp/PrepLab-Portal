import React, { useState, useEffect } from 'react';
import { Clock as ClockIcon, Settings, Globe, Eye, EyeOff } from 'lucide-react';
import { ClockSettings, WidgetSize } from './types';

interface ClockWidgetProps {
  size: WidgetSize;
  settings?: ClockSettings;
  onUpdateSettings?: (newSettings: ClockSettings) => void;
  isEditMode?: boolean;
}

const DEFAULT_SETTINGS: ClockSettings = {
  mode: 'digital',
  timezone: 'WIT',
  format24h: true,
  showSeconds: true
};

export const ClockWidget: React.FC<ClockWidgetProps> = ({
  size,
  settings = DEFAULT_SETTINGS,
  onUpdateSettings,
  isEditMode = false
}) => {
  const currentSettings = { ...DEFAULT_SETTINGS, ...settings };
  const [time, setTime] = useState(new Date());
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute timezone offset (Obi WIT is UTC+9, WITA is UTC+8, WIB is UTC+7)
  const getTimeInZone = (date: Date, zone: 'WIT' | 'WITA' | 'WIB') => {
    const targetOffset = zone === 'WIT' ? 9 : zone === 'WITA' ? 8 : 7;
    const utc = date.getTime() + date.getTimezoneOffset() * 60000;
    return new Date(utc + 3600000 * targetOffset);
  };

  const zoneTime = getTimeInZone(time, currentSettings.timezone);

  const hours = zoneTime.getHours();
  const minutes = zoneTime.getMinutes();
  const seconds = zoneTime.getSeconds();

  const formattedHours = currentSettings.format24h 
    ? String(hours).padStart(2, '0') 
    : String(hours % 12 || 12).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';

  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const dayString = dayNames[zoneTime.getDay()];
  const dateString = `${zoneTime.getDate()} ${monthNames[zoneTime.getMonth()]} ${zoneTime.getFullYear()}`;

  // Shift estimation
  const isNightShift = hours >= 19 || hours < 7;
  const shiftText = isNightShift ? 'Shift Malam (19:00 - 07:00)' : 'Shift Pagi (07:00 - 19:00)';

  const handleToggleMode = () => {
    onUpdateSettings?.({
      ...currentSettings,
      mode: currentSettings.mode === 'digital' ? 'analog' : 'digital'
    });
  };

  const handleChangeTimezone = (tz: 'WIT' | 'WITA' | 'WIB') => {
    onUpdateSettings?.({
      ...currentSettings,
      timezone: tz
    });
  };

  const handleToggle24h = () => {
    onUpdateSettings?.({
      ...currentSettings,
      format24h: !currentSettings.format24h
    });
  };

  const handleToggleSeconds = () => {
    onUpdateSettings?.({
      ...currentSettings,
      showSeconds: !currentSettings.showSeconds
    });
  };

  // Analog calculations
  const secondDeg = seconds * 6;
  const minuteDeg = minutes * 6 + seconds * 0.1;
  const hourDeg = (hours % 12) * 30 + minutes * 0.5;

  return (
    <div className="relative h-full flex flex-col justify-between select-none">
      {/* Top Header / Bar */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <ClockIcon className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-[var(--text-main)]">
            {currentSettings.mode === 'digital' ? 'Jam Digital' : 'Jam Analog'}
          </span>
          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
            {currentSettings.timezone}
          </span>
        </div>

        {/* Quick Config Button */}
        <button
          type="button"
          onClick={() => setShowConfig(!showConfig)}
          className={`p-1 rounded-lg text-xs transition-colors ${
            showConfig 
              ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400' 
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Pengaturan Jam"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Settings Dropdown Panel (Inline) */}
      {showConfig && (
        <div className="mb-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-[var(--border-main)] text-[11px] space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-muted)] font-medium">Tampilan:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleToggleMode}
                className={`px-2 py-0.5 rounded-md font-bold text-[10px] transition-all ${
                  currentSettings.mode === 'digital'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-700 text-[var(--text-muted)]'
                }`}
              >
                Digital
              </button>
              <button
                type="button"
                onClick={handleToggleMode}
                className={`px-2 py-0.5 rounded-md font-bold text-[10px] transition-all ${
                  currentSettings.mode === 'analog'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-700 text-[var(--text-muted)]'
                }`}
              >
                Analog
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-muted)] font-medium">Zona Waktu:</span>
            <div className="flex items-center gap-1">
              {(['WIT', 'WITA', 'WIB'] as const).map((tz) => (
                <button
                  key={tz}
                  type="button"
                  onClick={() => handleChangeTimezone(tz)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    currentSettings.timezone === tz
                      ? 'bg-teal-600 text-white'
                      : 'bg-white dark:bg-slate-700 text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {tz}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-[var(--border-main)]/50">
            <span className="text-[var(--text-muted)] font-medium">Format 24 Jam:</span>
            <button
              type="button"
              onClick={handleToggle24h}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                currentSettings.format24h
                  ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-[var(--text-muted)]'
              }`}
            >
              {currentSettings.format24h ? '24 Jam' : '12 Jam'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[var(--text-muted)] font-medium">Tampilkan Detik:</span>
            <button
              type="button"
              onClick={handleToggleSeconds}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                currentSettings.showSeconds
                  ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-[var(--text-muted)]'
              }`}
            >
              {currentSettings.showSeconds ? 'Aktif' : 'Mati'}
            </button>
          </div>
        </div>
      )}

      {/* Main Clock Content */}
      <div className="flex-1 flex flex-col justify-center items-center py-2">
        {currentSettings.mode === 'digital' ? (
          <div className={`w-full text-center ${size === '2x' ? 'flex items-center justify-around gap-4 text-left' : ''}`}>
            <div>
              <div className="flex items-baseline justify-center font-mono font-black tracking-tight text-[var(--text-main)]">
                <span className="text-3xl sm:text-4xl text-teal-600 dark:text-teal-400 font-display">
                  {formattedHours}:{formattedMinutes}
                </span>
                {currentSettings.showSeconds && (
                  <span className="text-lg sm:text-xl text-[var(--text-muted)] ml-1 font-mono">
                    :{formattedSeconds}
                  </span>
                )}
                {!currentSettings.format24h && (
                  <span className="text-xs font-bold text-amber-500 ml-1.5 uppercase font-sans">
                    {ampm}
                  </span>
                )}
              </div>

              <div className="mt-1 text-xs font-semibold text-[var(--text-muted)]">
                <span className="text-[var(--text-main)] font-bold">{dayString}</span>, {dateString}
              </div>
            </div>

            {/* Extended Info for 2x Size */}
            {size === '2x' && (
              <div className="hidden sm:flex flex-col gap-1.5 pl-4 border-l border-[var(--border-main)]/70 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-[var(--text-main)]">{shiftText}</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Site Obi (Halmahera Selatan) ● UTC+9
                </p>
                <div className="text-[10px] text-teal-700 dark:text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded-md w-fit border border-teal-500/20 font-medium">
                  {currentSettings.timezone === 'WIT' ? 'Waktu Lokal Site Aktif' : `Selisih: ${currentSettings.timezone}`}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Analog Clock Mode */
          <div className={`flex items-center justify-center gap-4 ${size === '2x' ? 'sm:justify-around w-full' : ''}`}>
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-teal-500/30 dark:border-teal-500/40 bg-white dark:bg-slate-900 shadow-inner flex items-center justify-center">
              {/* Dial markings */}
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-full h-full flex justify-center"
                  style={{ transform: `rotate(${i * 30}deg)` }}
                >
                  <div
                    className={`w-0.5 rounded-full ${
                      i % 3 === 0
                        ? 'h-2.5 bg-teal-600 dark:bg-teal-400'
                        : 'h-1.5 bg-slate-300 dark:bg-slate-600'
                    }`}
                  />
                </div>
              ))}

              {/* Hour hand */}
              <div
                className="absolute w-1 bg-slate-800 dark:bg-slate-100 rounded-full origin-bottom"
                style={{
                  height: '28%',
                  bottom: '50%',
                  transform: `rotate(${hourDeg}deg)`,
                  transition: 'transform 0.2s cubic-bezier(0.4, 2.08, 0.55, 0.44)'
                }}
              />

              {/* Minute hand */}
              <div
                className="absolute w-0.75 bg-teal-600 dark:bg-teal-400 rounded-full origin-bottom"
                style={{
                  height: '38%',
                  bottom: '50%',
                  transform: `rotate(${minuteDeg}deg)`,
                  transition: 'transform 0.2s cubic-bezier(0.4, 2.08, 0.55, 0.44)'
                }}
              />

              {/* Second hand */}
              {currentSettings.showSeconds && (
                <div
                  className="absolute w-0.5 bg-rose-500 rounded-full origin-bottom"
                  style={{
                    height: '42%',
                    bottom: '50%',
                    transform: `rotate(${secondDeg}deg)`
                  }}
                />
              )}

              {/* Center Pivot Pin */}
              <div className="w-2.5 h-2.5 rounded-full bg-teal-600 border-2 border-white dark:border-slate-900 z-10" />
            </div>

            {/* Analog Side Details */}
            <div className="text-left">
              <div className="font-mono font-bold text-sm text-[var(--text-main)]">
                {formattedHours}:{formattedMinutes} {!currentSettings.format24h && ampm}
              </div>
              <div className="text-[11px] font-bold text-teal-600 dark:text-teal-400">
                {dayString}
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">
                {dateString}
              </div>
              <span className="inline-block mt-1 text-[9px] font-black px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                {currentSettings.timezone}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Pill Status */}
      <div className="pt-2 border-t border-[var(--border-main)]/50 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
        <span className="flex items-center gap-1">
          <Globe className="w-3 h-3 text-teal-500" />
          <span>Site Obi Halmahera</span>
        </span>
        <span className="font-mono font-medium">
          {currentSettings.timezone} (UTC+{currentSettings.timezone === 'WIT' ? '9' : currentSettings.timezone === 'WITA' ? '8' : '7'})
        </span>
      </div>
    </div>
  );
};
