import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, Calendar, Presentation, Layers, Cpu, 
  FileSpreadsheet, Plus, Maximize2, Minimize2, Sparkles, 
  AlertCircle, BarChart3, Users, CheckCircle2, RefreshCw,
  Printer, Zap, Activity, MessageSquare, ClipboardCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { DailyPerformanceRecord, V2ViewMode } from './daily-performance-v2-types';
import { INITIAL_DAILY_PERFORMANCE_RECORDS } from '../daily-performance/daily-performance-seed';
import { 
  getStoredRecords, 
  saveStoredRecords, 
  STORAGE_KEY_DAILY_PERFORMANCE 
} from '../daily-performance/daily-performance-utils';
import { DailyPerformanceInputModal } from '../daily-performance/DailyPerformanceInputModal';
import { formatShiftName } from './daily-performance-v2-utils';

import { DailyPerformanceV2Briefing } from './DailyPerformanceV2Briefing';
import { DailyPerformanceV2Matrix } from './DailyPerformanceV2Matrix';
import { DailyPerformanceV2BottleneckRadar } from './DailyPerformanceV2BottleneckRadar';
import { DailyPerformanceV2Handover } from './DailyPerformanceV2Handover';
import { DailyPerformanceV2SummarySheet } from './DailyPerformanceV2SummarySheet';
import { DailyPerformanceV2ForemanRekapTable } from './DailyPerformanceV2ForemanRekapTable';
import { DailyPerformanceComparisonCharts } from '../daily-performance/DailyPerformanceComparisonCharts';
import { Table } from 'lucide-react';

interface DailyPerformanceV2ScreenProps {
  onBack?: () => void;
  inspectorNik?: string;
  inspectorName?: string;
  userPt?: string;
}

export const DailyPerformanceV2Screen: React.FC<DailyPerformanceV2ScreenProps> = ({
  onBack,
  inspectorNik,
  inspectorName,
  userPt = 'TBP'
}) => {
  const [records, setRecords] = useState<DailyPerformanceRecord[]>(() => {
    return getStoredRecords(INITIAL_DAILY_PERFORMANCE_RECORDS);
  });

  const [viewMode, setViewMode] = useState<V2ViewMode>('matrix');
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [showInputModal, setShowInputModal] = useState(false);

  // Default date: latest date with active samples
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const activeRecs = INITIAL_DAILY_PERFORMANCE_RECORDS.filter(r => r.sampleReceived.gc.shift > 0);
    return activeRecs[activeRecs.length - 1]?.date || '22/10/2026';
  });

  // Distinct dates list for the date selector
  const availableDates = useMemo(() => {
    const map = new Map<string, string>();
    records.forEach(r => {
      map.set(r.date, r.isoDate);
    });
    return Array.from(map.entries()).map(([date, isoDate]) => ({ date, isoDate }));
  }, [records]);

  // Check if selected date is Sunday Long Shift
  const isSelectedDateLongShift = useMemo(() => {
    const dayRecs = records.filter(r => r.date === selectedDate);
    return dayRecs.some(r => r.shiftType === 'LS');
  }, [records, selectedDate]);

  // Shift records for selected date
  const { dayRecord, nightRecord } = useMemo(() => {
    const dayRecs = records.filter(r => r.date === selectedDate);
    const dayRec = dayRecs.find(r => r.shiftType === 'DAY' || r.shiftType === 'LS') || null;
    const nightRec = dayRecs.find(r => r.shiftType === 'NIGHT') || null;
    return { dayRecord: dayRec, nightRecord: nightRec };
  }, [records, selectedDate]);

  // Shift assignment info for the day
  const shiftInfo = useMemo(() => {
    return {
      dayShift: dayRecord ? formatShiftName(dayRecord.regu) : 'Shift A',
      nightShift: nightRecord ? formatShiftName(nightRecord.regu) : 'Shift B'
    };
  }, [dayRecord, nightRecord]);

  // Handle saving newly inputted records
  const handleSaveRecord = (newRec: DailyPerformanceRecord) => {
    const updated = [newRec, ...records.filter(r => r.id !== newRec.id)];
    setRecords(updated);
    saveStoredRecords(updated);
    setSelectedDate(newRec.date);
    toast.success(`Data shift ${newRec.shiftType} tanggal ${newRec.date} berhasil disimpan.`);
  };

  // Reset to seed master data
  const handleResetToSeed = () => {
    if (window.confirm('Reset seluruh data Daily Performance ke master September & Oktober 2026?')) {
      localStorage.removeItem(STORAGE_KEY_DAILY_PERFORMANCE);
      setRecords(INITIAL_DAILY_PERFORMANCE_RECORDS);
      saveStoredRecords(INITIAL_DAILY_PERFORMANCE_RECORDS);
      toast.success('Data Daily Performance telah direset ke master template.');
    }
  };

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors ${
      isPresentationMode ? 'p-3 sm:p-6' : 'p-3 sm:p-6 pb-20'
    }`}>
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* TOP BAR / NAVIGATION CONTROLS */}
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
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/80 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                  {userPt || 'TBP'} Laboratory
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                  Cockpit Operasional
                </span>
                {isSelectedDateLongShift ? (
                  <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    MINGGU • LONG SHIFT (07-24)
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                    {shiftInfo.dayShift} (Day) & {shiftInfo.nightShift} (Night)
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 mt-0.5">
                Daily Performance Laboratory
              </h1>
            </div>
          </div>

          {/* Action Bar (Right Side) */}
          <div className="flex flex-wrap items-center gap-2.5">
            
            {/* Date Selector */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-slate-400 hidden sm:inline">Tanggal:</span>
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
            <div className="flex items-center p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs text-xs overflow-x-auto">
              <button
                onClick={() => setViewMode('matrix')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  viewMode === 'matrix'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Matriks Neraca 360°</span>
              </button>

              <button
                onClick={() => setViewMode('briefing')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  viewMode === 'briefing'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Presentation className="w-3.5 h-3.5" />
                <span>Briefing 5 Babak</span>
              </button>

              <button
                onClick={() => setViewMode('bottleneck')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  viewMode === 'bottleneck'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Radar Bottleneck</span>
              </button>

              <button
                onClick={() => setViewMode('handover')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  viewMode === 'handover'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Handover Shift</span>
              </button>

              <button
                onClick={() => setViewMode('foreman_rekap')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  viewMode === 'foreman_rekap'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Rekapan Mandor (8 Area)</span>
              </button>

              <button
                onClick={() => setViewMode('summary_sheet')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  viewMode === 'summary_sheet'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak 1-Lembar</span>
              </button>

              <button
                onClick={() => setViewMode('comparison_chart')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  viewMode === 'comparison_chart'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Mode Chart & Komparasi</span>
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
              title={isPresentationMode ? "Keluar Layar Penuh" : "Layar Penuh / Presentasi Meeting"}
            >
              {isPresentationMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Input Shift Modal Button */}
            {!isPresentationMode && (
              <button
                onClick={() => setShowInputModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-500/20 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Input Shift</span>
              </button>
            )}

            {/* Reset to Seed Button */}
            {!isPresentationMode && (
              <button
                onClick={handleResetToSeed}
                className="p-2 rounded-xl bg-white dark:bg-slate-900 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 cursor-pointer"
                title="Reset ke master data awal"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

          </div>
        </div>

        {/* MAIN BODY ACCORDING TO VIEW MODE */}
        {viewMode === 'matrix' && (
          <DailyPerformanceV2Matrix 
            records={records}
            selectedDate={selectedDate}
            userPt={userPt}
          />
        )}

        {viewMode === 'briefing' && (
          <DailyPerformanceV2Briefing 
            records={records}
            selectedDate={selectedDate}
            isPresentationMode={isPresentationMode}
            onToggleFullscreen={() => setIsPresentationMode(!isPresentationMode)}
            userPt={userPt}
          />
        )}

        {viewMode === 'foreman_rekap' && (
          dayRecord ? (
            <DailyPerformanceV2ForemanRekapTable 
              dayRecord={dayRecord}
              nightRecord={nightRecord}
              isLongShift={isSelectedDateLongShift}
            />
          ) : (
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Data Belum Tersedia</h3>
              <p className="text-xs text-slate-500">
                Tidak ditemukan data logbook kinerja untuk tanggal {selectedDate}.
              </p>
            </div>
          )
        )}

        {viewMode === 'bottleneck' && (
          <DailyPerformanceV2BottleneckRadar 
            records={records}
            selectedDate={selectedDate}
          />
        )}

        {viewMode === 'handover' && (
          <DailyPerformanceV2Handover 
            records={records}
            selectedDate={selectedDate}
            inspectorName={inspectorName}
            userPt={userPt}
          />
        )}

        {viewMode === 'summary_sheet' && (
          <DailyPerformanceV2SummarySheet 
            records={records}
            selectedDate={selectedDate}
            inspectorName={inspectorName}
            userPt={userPt}
          />
        )}

        {viewMode === 'comparison_chart' && (
          <DailyPerformanceComparisonCharts 
            records={records}
            onSelectDate={d => {
              setSelectedDate(d);
              setViewMode('briefing');
            }}
          />
        )}
      </div>

      {/* Input Modal */}
      <DailyPerformanceInputModal
        isOpen={showInputModal}
        onClose={() => setShowInputModal(false)}
        onSave={handleSaveRecord}
        existingRecords={records}
      />
    </div>
  );
};
