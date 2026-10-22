import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Calendar, Layers, Cpu, FileSpreadsheet, Plus, 
  Maximize2, Minimize2, Sparkles, AlertCircle, BarChart3,
  Users, CheckCircle2, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { DailyPerformanceRecord, ViewMode } from './daily-performance-types';
import { INITIAL_DAILY_PERFORMANCE_RECORDS } from './daily-performance-seed';
import { 
  getStoredRecords, saveStoredRecords, calculateSummaryKPIs, 
  formatNumber, STORAGE_KEY_DAILY_PERFORMANCE 
} from './daily-performance-utils';
import { DailyPerformancePipelineFunnel } from './DailyPerformancePipelineFunnel';
import { DailyPerformanceStationCards } from './DailyPerformanceStationCards';
import { DailyPerformanceTable } from './DailyPerformanceTable';
import { DailyPerformanceInputModal } from './DailyPerformanceInputModal';
import { DailyPerformanceStructuredPresentation } from './DailyPerformanceStructuredPresentation';
import { Presentation } from 'lucide-react';

interface DailyPerformanceScreenProps {
  onBack?: () => void;
  inspectorNik?: string;
  inspectorName?: string;
  userPt?: string;
}

export const DailyPerformanceScreen: React.FC<DailyPerformanceScreenProps> = ({
  onBack,
  inspectorNik,
  inspectorName,
  userPt
}) => {
  const [records, setRecords] = useState<DailyPerformanceRecord[]>(() => {
    return getStoredRecords(INITIAL_DAILY_PERFORMANCE_RECORDS);
  });

  const [viewMode, setViewMode] = useState<ViewMode>('presentation');
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [showInputModal, setShowInputModal] = useState(false);

  // Default to the latest active date in records
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Find latest record with non-zero received
    const activeRecs = INITIAL_DAILY_PERFORMANCE_RECORDS.filter(r => r.sampleReceived.gc.shift > 0);
    return activeRecs[activeRecs.length - 1]?.date || '19/10/2026';
  });

  // Calculate high-level KPIs across all records
  const kpis = useMemo(() => calculateSummaryKPIs(records), [records]);

  // Distinct dates list for the date selector
  const availableDates = useMemo(() => {
    const map = new Map<string, string>();
    records.forEach(r => {
      map.set(r.date, r.isoDate);
    });
    return Array.from(map.entries()).map(([date, isoDate]) => ({ date, isoDate }));
  }, [records]);

  // Dynamic month title derived from selected date
  const selectedPeriodLabel = useMemo(() => {
    if (!selectedDate) return 'September - Oktober 2026';
    const parts = selectedDate.split('/');
    if (parts.length === 3) {
      const monthMap: Record<string, string> = {
        '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
        '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
        '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember'
      };
      return `${monthMap[parts[1]] || parts[1]} ${parts[2]}`;
    }
    return '2026';
  }, [selectedDate]);

  // Handle adding new record
  const handleSaveRecord = (newRec: DailyPerformanceRecord) => {
    const updated = [newRec, ...records.filter(r => r.id !== newRec.id)];
    setRecords(updated);
    saveStoredRecords(updated);
    setSelectedDate(newRec.date);
  };

  // Reset to initial seed
  const handleResetToSeed = () => {
    if (window.confirm('Reset seluruh data ke data master September & Oktober 2026 awal?')) {
      localStorage.removeItem(STORAGE_KEY_DAILY_PERFORMANCE);
      setRecords(INITIAL_DAILY_PERFORMANCE_RECORDS);
      saveStoredRecords(INITIAL_DAILY_PERFORMANCE_RECORDS);
      toast.success('Data daily performance telah direset ke master template.');
    }
  };

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors ${
      isPresentationMode ? 'p-4 sm:p-8' : 'p-4 sm:p-6 pb-20'
    }`}>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* TOP NAVIGATION & CONTROLS BAR */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onBack && !isPresentationMode && (
              <button
                onClick={onBack}
                className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all cursor-pointer shadow-xs"
                title="Kembali ke Menu Utama"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
                  {userPt || 'TBP'} Laboratory
                </span>
                <span className="text-xs text-slate-400">• Periode {selectedPeriodLabel}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Daily Performance Laboratorium
              </h1>
            </div>
          </div>

          {/* Right Action Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Date Quick Selector */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-slate-400">Pilih Tanggal:</span>
              <select
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="font-bold text-slate-800 dark:text-white bg-transparent cursor-pointer focus:outline-none"
              >
                {availableDates.map(d => (
                  <option key={d.date} value={d.date} className="dark:bg-slate-900">
                    {d.date}
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-xs">
              <button
                onClick={() => setViewMode('presentation')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  viewMode === 'presentation'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Presentation className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Alur Presentasi (5 Babak)</span>
                <span className="sm:hidden">Presentasi</span>
              </button>
              <button
                onClick={() => setViewMode('pipeline')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  viewMode === 'pipeline'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pipeline Flow</span>
                <span className="sm:hidden">Flow</span>
              </button>
              <button
                onClick={() => setViewMode('station')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  viewMode === 'station'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Stasiun Rinci</span>
                <span className="sm:hidden">Rinci</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tabel Logbook</span>
                <span className="sm:hidden">Tabel</span>
              </button>
            </div>

            {/* Presentation Mode Toggle */}
            <button
              onClick={() => setIsPresentationMode(!isPresentationMode)}
              className={`p-2 rounded-xl border transition-all cursor-pointer shadow-xs ${
                isPresentationMode
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
              }`}
              title={isPresentationMode ? "Keluar Mode Presentasi" : "Masuk Mode Presentasi Meeting (Layar Penuh)"}
            >
              {isPresentationMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Input Shift Baru Button */}
            {!isPresentationMode && (
              <button
                onClick={() => setShowInputModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-500/20 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Input Shift</span>
              </button>
            )}

            {/* Reset to seed */}
            {!isPresentationMode && (
              <button
                onClick={handleResetToSeed}
                className="p-2 rounded-xl bg-white dark:bg-slate-900 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 cursor-pointer"
                title="Reset ke master data Oktober 2026"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>


        {/* MAIN BODY VIEW ACCORDING TO VIEW MODE */}
        {viewMode === 'presentation' && (
          <DailyPerformanceStructuredPresentation 
            records={records}
            selectedDate={selectedDate}
            isPresentationMode={isPresentationMode}
            onSaveRecord={handleSaveRecord}
            userPt={userPt}
          />
        )}

        {viewMode === 'pipeline' && (
          <DailyPerformancePipelineFunnel 
            records={records} 
            selectedDate={selectedDate}
            isPresentationMode={isPresentationMode}
          />
        )}

        {viewMode === 'station' && (
          <DailyPerformanceStationCards 
            records={records} 
            selectedDate={selectedDate}
          />
        )}

        {viewMode === 'table' && (
          <DailyPerformanceTable records={records} />
        )}

      </div>

      {/* Input Shift Modal */}
      <DailyPerformanceInputModal
        isOpen={showInputModal}
        onClose={() => setShowInputModal(false)}
        onSave={handleSaveRecord}
        existingRecords={records}
      />
    </div>
  );
};
