import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Layers, Flame, Cpu, FileCheck, ChevronLeft, 
  ChevronRight, Maximize2, Minimize2, CheckCircle2, 
  AlertTriangle, Zap, ArrowRight, TrendingUp, Sparkles
} from 'lucide-react';
import { DailyPerformanceRecord, BatchBreakdownItem } from './daily-performance-v2-types';
import { 
  formatNumber, 
  formatShiftName, 
  calculateMonthlyPeaks,
  getStoredSampleBatches,
  calculateBatchBreakdown,
  getDefaultBatchBreakdown
} from './daily-performance-v2-utils';
import { DailyPerformanceV2InBarCell } from './DailyPerformanceV2InBarCell';
import { DailyPerformanceV2ShiftRelayCard } from './DailyPerformanceV2ShiftRelayCard';
import { DailyPerformanceV2ForemanRekapTable } from './DailyPerformanceV2ForemanRekapTable';
import { DailyPerformanceV2BatchManagerModal } from './DailyPerformanceV2BatchManagerModal';
import { DailyPerformanceV2AbsenteeList } from './DailyPerformanceV2AbsenteeList';
import { Table, Eye } from 'lucide-react';

interface DailyPerformanceV2BriefingProps {
  records: DailyPerformanceRecord[];
  selectedDate: string;
  isPresentationMode?: boolean;
  onToggleFullscreen?: () => void;
  userPt?: string;
}

export const DailyPerformanceV2Briefing: React.FC<DailyPerformanceV2BriefingProps> = ({
  records,
  selectedDate,
  isPresentationMode = false,
  onToggleFullscreen,
  userPt = 'TBP'
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [showForemanRekapInBabak3, setShowForemanRekapInBabak3] = useState<boolean>(false);
  const [activeBatchModalStation, setActiveBatchModalStation] = useState<{
    stationKey: 'weighing' | 'fusion' | 'loi';
    name: string;
  } | null>(null);

  // Batch updates event listener
  const [batchUpdateTick, setBatchUpdateTick] = useState<number>(0);
  useEffect(() => {
    const handleUpdate = () => setBatchUpdateTick(prev => prev + 1);
    window.addEventListener('preplab-batches-updated', handleUpdate);
    return () => window.removeEventListener('preplab-batches-updated', handleUpdate);
  }, []);

  // Records for current date
  const recordsForDate = useMemo(() => {
    return records.filter(r => r.date === selectedDate);
  }, [records, selectedDate]);

  // Is Sunday Long Shift?
  const isLongShift = useMemo(() => {
    return recordsForDate.some(r => r.shiftType === 'LS');
  }, [recordsForDate]);

  const dayRecord = useMemo(() => {
    return recordsForDate.find(r => r.shiftType === 'DAY' || r.shiftType === 'LS');
  }, [recordsForDate]);

  const nightRecord = useMemo(() => {
    if (isLongShift) return null;
    return recordsForDate.find(r => r.shiftType === 'NIGHT');
  }, [recordsForDate, isLongShift]);

  // Monthly peaks for in-bar metrics
  const peaks = useMemo(() => {
    const isoDate = dayRecord?.isoDate || '2026-10-01';
    return calculateMonthlyPeaks(records, isoDate);
  }, [records, dayRecord]);

  // --- BATCH BREAKDOWNS FOR STATIONS (WEIGHING, FUSION, LOI) ---
  const weighingBatches = useMemo(() => {
    return getStoredSampleBatches(selectedDate, 'weighing');
  }, [selectedDate, batchUpdateTick]);

  const weighingOsDayBreakdown = useMemo(() => {
    const os = calculateBatchBreakdown(weighingBatches, false);
    return os.length > 0 ? os : getDefaultBatchBreakdown(dayRecord?.fuseBead.balExp || 168);
  }, [weighingBatches, dayRecord]);

  const weighingOsMorningBreakdown = useMemo(() => {
    return getDefaultBatchBreakdown(dayRecord?.fuseBead.osExp || 180);
  }, [dayRecord]);

  const weighingBalanceNightBreakdown = useMemo(() => {
    const nightBal = nightRecord?.fuseBead.balExp ?? dayRecord?.fuseBead.balExp;
    return getDefaultBatchBreakdown(nightBal || 0);
  }, [nightRecord, dayRecord]);

  // Fusion Batches
  const fusionBatches = useMemo(() => {
    return getStoredSampleBatches(selectedDate, 'fusion');
  }, [selectedDate, batchUpdateTick]);

  const fusionOsDayBreakdown = useMemo(() => {
    const os = calculateBatchBreakdown(fusionBatches, false);
    return os.length > 0 ? os : getDefaultBatchBreakdown(dayRecord?.fuseBead.balExp || 120);
  }, [fusionBatches, dayRecord]);

  const fusionOsMorningBreakdown = useMemo(() => {
    return getDefaultBatchBreakdown(dayRecord?.fuseBead.osExp || 144);
  }, [dayRecord]);

  const fusionBalanceNightBreakdown = useMemo(() => {
    const nightBal = nightRecord?.fuseBead.balExp ?? dayRecord?.fuseBead.balExp;
    return getDefaultBatchBreakdown(nightBal || 0);
  }, [nightRecord, dayRecord]);

  // LOI Batches
  const loiBatches = useMemo(() => {
    return getStoredSampleBatches(selectedDate, 'loi');
  }, [selectedDate, batchUpdateTick]);

  const loiOsDayBreakdown = useMemo(() => {
    const os = calculateBatchBreakdown(loiBatches, false);
    return os.length > 0 ? os : getDefaultBatchBreakdown(dayRecord?.loi.bal || 78);
  }, [loiBatches, dayRecord]);

  const loiOsMorningBreakdown = useMemo(() => {
    return getDefaultBatchBreakdown(dayRecord?.loi.os || 104);
  }, [dayRecord]);

  const loiBalanceNightBreakdown = useMemo(() => {
    const nightBal = nightRecord?.loi.bal ?? dayRecord?.loi.bal;
    return getDefaultBatchBreakdown(nightBal || 0);
  }, [nightRecord, dayRecord]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        setCurrentStep(prev => Math.min(5, prev + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentStep(prev => Math.max(1, prev - 1));
      } else if (['1', '2', '3', '4', '5'].includes(e.key)) {
        setCurrentStep(parseInt(e.key, 10));
      } else if (e.key.toLowerCase() === 'f' && onToggleFullscreen) {
        onToggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleFullscreen]);

  if (!dayRecord) {
    return (
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-800 dark:text-white">Data Belum Tersedia</h3>
        <p className="text-xs text-slate-500">
          Tidak ditemukan logbook kinerja untuk tanggal {selectedDate}. Silakan pilih tanggal lain dari pemilih tanggal di atas.
        </p>
      </div>
    );
  }

  const shiftDayName = formatShiftName(dayRecord.regu);
  const shiftNightName = nightRecord ? formatShiftName(nightRecord.regu) : '-';

  const steps = [
    { num: 1, title: 'Manpower & SDM', desc: 'Kehadiran Staff & Crew', icon: Users },
    { num: 2, title: 'Sample Received', desc: 'GC, Prod, Exp, Smelter', icon: Layers },
    { num: 3, title: 'Productivity Preparasi', desc: 'Press, Fusion & LOI', icon: Flame },
    { num: 4, title: 'Instrumen ED & WD', desc: '6 EDXRF + 2 Zetium', icon: Cpu },
    { num: 5, title: 'QC & Pelaporan CoA', desc: 'Mutu & Rilis Sertifikat', icon: FileCheck },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* SLIDE NAVIGATION BAR */}
      <div className="p-2 sm:p-3 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1">
          {steps.map(step => {
            const Icon = step.icon;
            const isActive = currentStep === step.num;
            return (
              <button
                key={step.num}
                onClick={() => setCurrentStep(step.num)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive 
                    ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-500/30' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-mono ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {step.num}
                </span>
                <span className="hidden sm:inline">{step.title}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-slate-600 dark:text-slate-300"
            title="Babak Sebelumnya (Panah Kiri)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-bold text-slate-500 px-1">
            {currentStep}/5
          </span>
          <button
            onClick={() => setCurrentStep(prev => Math.min(5, prev + 1))}
            disabled={currentStep === 5}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-slate-600 dark:text-slate-300"
            title="Babak Selanjutnya (Panah Kanan / Spasi)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-slate-600 dark:text-slate-300 ml-1 hidden sm:block"
              title="Layar Penuh / Fullscreen (Tombol F)"
            >
              {isPresentationMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* SLIDE CONTENT AREA */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm min-h-[460px] flex flex-col justify-between space-y-6">
        
        {/* ================= BABAK 1: SDM & MANPOWER ================= */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
                  Babak 1 dari 5
                </span>
                <span className="text-xs text-slate-400">• Tanggal {selectedDate}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                Kesiapan Sumber Daya Manusia (SDM & Personil Shift)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Evaluasi kehadiran staff dan crew laboratorium, kesiapan roster, dan pengawalan shift operasional.
              </p>
            </div>

            <div className={`grid gap-4 ${isLongShift ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
              
              {/* Day / Long Shift Card */}
              <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                      {isLongShift ? 'SHIFT TUNGGAL HARI MINGGU' : 'SHIFT PAGI'}
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-amber-950 dark:text-amber-100">
                      {isLongShift ? `${shiftDayName} • LONG SHIFT (07:00 - 24:00 WITA)` : `${shiftDayName} • DAY (07:00 - 19:00 WITA)`}
                    </h3>
                  </div>
                  <span className="text-sm font-mono font-black text-amber-800 dark:text-amber-200 px-3 py-1 rounded-xl bg-amber-100 dark:bg-amber-900/60 border border-amber-200 dark:border-amber-800">
                    {dayRecord.manpower.staff.shift + dayRecord.manpower.crew.shift} Orang Hadir
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-medium">Staff Hadir</span>
                    <span className="text-lg font-black font-mono text-slate-800 dark:text-slate-100 mt-0.5 block">{dayRecord.manpower.staff.shift}</span>
                    <span className="text-[9px] text-slate-400">Total {dayRecord.manpower.staff.total}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-medium">Crew Hadir</span>
                    <span className="text-lg font-black font-mono text-slate-800 dark:text-slate-100 mt-0.5 block">{dayRecord.manpower.crew.shift}</span>
                    <span className="text-[9px] text-slate-400">Total {dayRecord.manpower.crew.total}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-medium">Bantuan Lab</span>
                    <span className="text-lg font-black font-mono text-teal-600 dark:text-teal-400 mt-0.5 block">+{dayRecord.manpower.crew.bantn || 0}</span>
                    <span className="text-[9px] text-slate-400">{dayRecord.manpower.crew.lab || 0} stasiun</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-medium">Tidak Hadir</span>
                    <span className="text-lg font-black font-mono text-rose-600 dark:text-rose-400 mt-0.5 block">
                      {dayRecord.manpower.staff.cuti + dayRecord.manpower.crew.cuti + 
                       dayRecord.manpower.staff.izin + dayRecord.manpower.crew.izin + 
                       dayRecord.manpower.staff.sakit + dayRecord.manpower.crew.sakit}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      C:{dayRecord.manpower.staff.cuti + dayRecord.manpower.crew.cuti} • I:{dayRecord.manpower.staff.izin + dayRecord.manpower.crew.izin} • S:{dayRecord.manpower.staff.sakit + dayRecord.manpower.crew.sakit}
                    </span>
                  </div>
                </div>

                {dayRecord.manpowerNotes && (
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                    <span className="font-bold text-amber-800 dark:text-amber-400">Catatan Personel: </span>
                    {dayRecord.manpowerNotes}
                  </div>
                )}
              </div>

              {/* Night Card: Strictly hidden on Long Shift */}
              {!isLongShift && nightRecord && (
                <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                        SHIFT MALAM
                      </span>
                      <h3 className="text-base sm:text-lg font-black text-indigo-950 dark:text-indigo-100">
                        {shiftNightName} • NIGHT (19:00 - 07:00 WITA)
                      </h3>
                    </div>
                    <span className="text-sm font-mono font-black text-indigo-800 dark:text-indigo-200 px-3 py-1 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800">
                      {nightRecord.manpower.staff.shift + nightRecord.manpower.crew.shift} Orang Hadir
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-medium">Staff Hadir</span>
                      <span className="text-lg font-black font-mono text-slate-800 dark:text-slate-100 mt-0.5 block">{nightRecord.manpower.staff.shift}</span>
                      <span className="text-[9px] text-slate-400">Total {nightRecord.manpower.staff.total}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-medium">Crew Hadir</span>
                      <span className="text-lg font-black font-mono text-slate-800 dark:text-slate-100 mt-0.5 block">{nightRecord.manpower.crew.shift}</span>
                      <span className="text-[9px] text-slate-400">Total {nightRecord.manpower.crew.total}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-medium">Bantuan Lab</span>
                      <span className="text-lg font-black font-mono text-teal-600 dark:text-teal-400 mt-0.5 block">+{nightRecord.manpower.crew.bantn || 0}</span>
                      <span className="text-[9px] text-slate-400">{nightRecord.manpower.crew.lab || 0} stasiun</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-medium">Tidak Hadir</span>
                      <span className="text-lg font-black font-mono text-rose-600 dark:text-rose-400 mt-0.5 block">
                        {nightRecord.manpower.staff.cuti + nightRecord.manpower.crew.cuti + 
                         nightRecord.manpower.staff.izin + nightRecord.manpower.crew.izin + 
                         nightRecord.manpower.staff.sakit + nightRecord.manpower.crew.sakit}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        C:{nightRecord.manpower.staff.cuti + nightRecord.manpower.crew.cuti} • I:{nightRecord.manpower.staff.izin + nightRecord.manpower.crew.izin} • S:{nightRecord.manpower.staff.sakit + nightRecord.manpower.crew.sakit}
                      </span>
                    </div>
                  </div>

                  {nightRecord.manpowerNotes && (
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200/60 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-bold text-indigo-800 dark:text-indigo-400">Catatan Personel: </span>
                      {nightRecord.manpowerNotes}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

        {/* ================= BABAK 2: SAMPLE RECEIVED ================= */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2.5 py-0.5 rounded-md border border-sky-200 dark:border-sky-800">
                  Babak 2 dari 5
                </span>
                <span className="text-xs text-slate-400">• Hulu Alur Proses</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                Penerimaan Sampel (Sample Received by Source)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Volume sampel masuk berdasarkan tambang/unit asal: Grade Control (GC), Produksi & Resource Check (RC), Eksplorasi (EXP), dan Smelter.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* GC */}
              <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Grade Control (GC)</span>
                  <span className="text-[10px] text-emerald-600 font-mono">Pit Tambang</span>
                </div>
                <DailyPerformanceV2InBarCell
                  value={dayRecord.sampleReceived.gc.shift + (nightRecord?.sampleReceived.gc.shift || 0)}
                  maxValue={peaks.maxReceivedGc}
                  colorVariant="emerald"
                  prefix="+"
                  unit="spl"
                  size="lg"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>{isLongShift ? `LS: +${dayRecord.sampleReceived.gc.shift}` : `D: +${dayRecord.sampleReceived.gc.shift} • N: +${nightRecord?.sampleReceived.gc.shift || 0}`}</span>
                  <span>Wkly: {formatNumber(dayRecord.sampleReceived.gc.wkly)}</span>
                </div>
              </div>

              {/* PROD */}
              <div className="p-4 rounded-2xl bg-sky-50/40 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-800 dark:text-sky-300">Produksi & RC</span>
                  <span className="text-[10px] text-sky-600 font-mono">{dayRecord.sampleReceived.prod.rc} RC</span>
                </div>
                <DailyPerformanceV2InBarCell
                  value={dayRecord.sampleReceived.prod.shift + (nightRecord?.sampleReceived.prod.shift || 0)}
                  maxValue={peaks.maxReceivedProd}
                  colorVariant="sky"
                  prefix="+"
                  unit="spl"
                  size="lg"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>{isLongShift ? `LS: +${dayRecord.sampleReceived.prod.shift}` : `D: +${dayRecord.sampleReceived.prod.shift} • N: +${nightRecord?.sampleReceived.prod.shift || 0}`}</span>
                  <span>Wkly: {formatNumber(dayRecord.sampleReceived.prod.wkly)}</span>
                </div>
              </div>

              {/* EXP */}
              <div className="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300">Eksplorasi (EXP)</span>
                  <span className="text-[10px] text-amber-600 font-mono">Drilling Bor</span>
                </div>
                <DailyPerformanceV2InBarCell
                  value={dayRecord.sampleReceived.exp.shift + (nightRecord?.sampleReceived.exp.shift || 0)}
                  maxValue={peaks.maxReceivedExp}
                  colorVariant="amber"
                  prefix="+"
                  unit="spl"
                  size="lg"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>{isLongShift ? `LS: +${dayRecord.sampleReceived.exp.shift}` : `D: +${dayRecord.sampleReceived.exp.shift} • N: +${nightRecord?.sampleReceived.exp.shift || 0}`}</span>
                  <span>Wkly: {formatNumber(dayRecord.sampleReceived.exp.wkly)}</span>
                </div>
              </div>

              {/* SMELTER */}
              <div className="p-4 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-800 dark:text-purple-300">Smelter HPL</span>
                  <span className="text-[10px] text-purple-600 font-mono">Plant</span>
                </div>
                <DailyPerformanceV2InBarCell
                  value={dayRecord.sampleReceived.smelter.shift + (nightRecord?.sampleReceived.smelter.shift || 0)}
                  maxValue={peaks.maxReceivedSmelter}
                  colorVariant="purple"
                  prefix="+"
                  unit="spl"
                  size="lg"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>{isLongShift ? `LS: +${dayRecord.sampleReceived.smelter.shift}` : `D: +${dayRecord.sampleReceived.smelter.shift} • N: +${nightRecord?.sampleReceived.smelter.shift || 0}`}</span>
                  <span>Wkly: {formatNumber(dayRecord.sampleReceived.smelter.wkly)}</span>
                </div>
              </div>
            </div>

            {/* Total Callout */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Sampel Diterima (24 Jam)</span>
                <span className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5 block">
                  +{formatNumber(dayRecord.sampleReceived.gc.day + dayRecord.sampleReceived.prod.day + dayRecord.sampleReceived.exp.day + dayRecord.sampleReceived.smelter.day)} Sampel Masuk
                </span>
              </div>
              <div className="text-right text-xs">
                <span className="text-slate-500 font-medium block">Sumber Terbanyak:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  Grade Control Pit ({Math.round(((dayRecord.sampleReceived.gc.day) / Math.max(1, (dayRecord.sampleReceived.gc.day + dayRecord.sampleReceived.prod.day + dayRecord.sampleReceived.exp.day + dayRecord.sampleReceived.smelter.day))) * 100)}% Volume)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ================= BABAK 3: PREPARASI & PRODUKTIVITAS ================= */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                    Babak 3 dari 5
                  </span>
                  <span className="text-xs text-slate-400">• Inti Pengolahan Fisik & Estafet Shift</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                  Produktivitas Preparasi & Neraca Estafet Antar-Shift
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Alur bersambung: Saldo Warisan Kemarin ➔ Kinerja Pagi (Day) ➔ Beban Dioper ke Malam (Night) ➔ Saldo Outstanding untuk Besok Pagi.
                </p>
              </div>

              {/* Toggle Tombol Lembar Kerja Foreman */}
              <button
                onClick={() => setShowForemanRekapInBabak3(!showForemanRekapInBabak3)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold border transition-all cursor-pointer shadow-xs ${
                  showForemanRekapInBabak3
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Table className="w-4 h-4 text-teal-500" />
                <span>{showForemanRekapInBabak3 ? 'Tutup Rekapan Foreman' : 'Lihat Rekapan Asli Foreman (Excel)'}</span>
              </button>
            </div>

            {/* JIKA USER MENEKAN LIHAT REKAPAN ASLI FOREMAN */}
            {showForemanRekapInBabak3 && (
              <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 animate-in fade-in duration-200">
                <DailyPerformanceV2ForemanRekapTable
                  dayRecord={dayRecord}
                  nightRecord={nightRecord}
                  isLongShift={isLongShift}
                />
              </div>
            )}

            {/* KARTU ALUR ESTAFET 4 TAHAP PER STASIUN KERJA */}
            <div className="space-y-4">
              
              {/* 1. Stasiun Press Powder Pellet */}
              <DailyPerformanceV2ShiftRelayCard
                title="1. Press Pellet"
                stationSubtitle="GC Pit Tambang & Smelter"
                unit="pellet"
                osMorning={30}
                receivedDay={dayRecord.pressPowder.received.shift}
                finishedDay={dayRecord.pressPowder.finish.shift}
                balanceDay={Math.max(0, 30 + dayRecord.pressPowder.received.shift - dayRecord.pressPowder.finish.shift)}
                receivedNight={nightRecord?.pressPowder.received.shift || 0}
                finishedNight={nightRecord?.pressPowder.finish.shift || 0}
                balanceNight={Math.max(0, (30 + dayRecord.pressPowder.received.shift - dayRecord.pressPowder.finish.shift) + (nightRecord?.pressPowder.received.shift || 0) - (nightRecord?.pressPowder.finish.shift || 0))}
                shiftDayName={shiftDayName}
                shiftNightName={shiftNightName}
                isLongShift={isLongShift}
                maxMonthFinish={peaks.maxPressFinish}
                colorVariant="teal"
              />

              {/* 2. Stasiun Weighing */}
              <DailyPerformanceV2ShiftRelayCard
                title="2. Weighing"
                stationSubtitle="Penimbangan Flux Borat & Sampel EXP Bor"
                unit="spl"
                osMorning={dayRecord.fuseBead.osExp}
                receivedDay={dayRecord.sampleReceived.exp.shift}
                finishedDay={dayRecord.fuseBead.finishShift}
                balanceDay={dayRecord.fuseBead.balExp}
                receivedNight={nightRecord?.sampleReceived.exp.shift || 0}
                finishedNight={nightRecord?.fuseBead.finishShift || 0}
                balanceNight={nightRecord?.fuseBead.balExp || dayRecord.fuseBead.balExp}
                shiftDayName={shiftDayName}
                shiftNightName={shiftNightName}
                isLongShift={isLongShift}
                maxMonthFinish={peaks.maxFusionFinish}
                colorVariant="amber"
                osMorningBreakdown={weighingOsMorningBreakdown}
                osDayBreakdown={weighingOsDayBreakdown}
                balanceNightBreakdown={weighingBalanceNightBreakdown}
                onOpenBatchManager={() => setActiveBatchModalStation({ stationKey: 'weighing', name: 'Weighing' })}
                batchManagerLabel="Kelola Batch (Received & Finish)"
              />

              {/* 3. Stasiun Fusion */}
              <DailyPerformanceV2ShiftRelayCard
                title="3. Fusion"
                stationSubtitle="Peleburan Manik Kaca (Claisse / M4 Flux)"
                unit="bead"
                osMorning={Math.round((dayRecord.fuseBead.osExp || 144) * 0.9)}
                receivedDay={dayRecord.fuseBead.finishShift}
                finishedDay={Math.round(dayRecord.fuseBead.finishShift * 0.95)}
                balanceDay={Math.max(0, dayRecord.fuseBead.balExp - 24)}
                receivedNight={nightRecord?.fuseBead.finishShift || 0}
                finishedNight={Math.round((nightRecord?.fuseBead.finishShift || 0) * 0.95)}
                balanceNight={Math.max(0, (nightRecord?.fuseBead.balExp || dayRecord.fuseBead.balExp) - 24)}
                shiftDayName={shiftDayName}
                shiftNightName={shiftNightName}
                isLongShift={isLongShift}
                maxMonthFinish={peaks.maxFusionFinish}
                colorVariant="purple"
                osMorningBreakdown={fusionOsMorningBreakdown}
                osDayBreakdown={fusionOsDayBreakdown}
                balanceNightBreakdown={fusionBalanceNightBreakdown}
                onOpenBatchManager={() => setActiveBatchModalStation({ stationKey: 'fusion', name: 'Fusion Bead' })}
                batchManagerLabel="Kelola Batch (Received & Finish)"
              />

              {/* 4. Stasiun LOI */}
              <DailyPerformanceV2ShiftRelayCard
                title="4. LOI"
                stationSubtitle={`Loss On Ignition • Furnace W2 (${dayRecord.loi.w2}) • W4 (${dayRecord.loi.w4}) • W5 (${dayRecord.loi.w5})`}
                unit="spl"
                osMorning={dayRecord.loi.os}
                receivedDay={dayRecord.loi.finLoiDay > 0 ? Math.round(dayRecord.loi.finLoiDay / 2) : 52}
                finishedDay={dayRecord.loi.finLoiShift}
                balanceDay={dayRecord.loi.bal}
                receivedNight={nightRecord ? 52 : 0}
                finishedNight={nightRecord?.loi.finLoiShift || 0}
                balanceNight={nightRecord?.loi.bal || dayRecord.loi.bal}
                shiftDayName={shiftDayName}
                shiftNightName={shiftNightName}
                isLongShift={isLongShift}
                maxMonthFinish={peaks.maxLoiFinish}
                colorVariant="rose"
                osMorningBreakdown={loiOsMorningBreakdown}
                osDayBreakdown={loiOsDayBreakdown}
                balanceNightBreakdown={loiBalanceNightBreakdown}
                onOpenBatchManager={() => setActiveBatchModalStation({ stationKey: 'loi', name: 'LOI' })}
                batchManagerLabel="Kelola Batch (Received & Finish)"
                extraSnippet={
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-mono">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Tray Furnace Terpakai:</span>
                    <span>W2: {dayRecord.loi.w2} spl</span> •
                    <span>W4: {dayRecord.loi.w4} spl</span> •
                    <span>W5: {dayRecord.loi.w5} spl</span>
                  </div>
                }
              />

              {/* 5. Spektrometri WDXRF (Zetium A & B) */}
              <DailyPerformanceV2ShiftRelayCard
                title="5. Spektrometri WDXRF (Zetium A & B • Manik Borat)"
                stationSubtitle="Pembacaan Komposisi Kimia Presisi"
                unit="runs"
                osMorning={dayRecord.wdxrf.osExp}
                receivedDay={dayRecord.fuseBead.finishShift}
                finishedDay={(dayRecord.wdxrf.zetiumA.total || 0) + (dayRecord.wdxrf.zetiumB.total || 0)}
                balanceDay={dayRecord.wdxrf.bal}
                receivedNight={nightRecord?.fuseBead.finishShift || 0}
                finishedNight={nightRecord ? (nightRecord.wdxrf.zetiumA.total || 0) + (nightRecord.wdxrf.zetiumB.total || 0) : 0}
                balanceNight={nightRecord?.wdxrf.bal || dayRecord.wdxrf.bal}
                shiftDayName={shiftDayName}
                shiftNightName={shiftNightName}
                isLongShift={isLongShift}
                maxMonthFinish={peaks.maxZetiumTotal}
                colorVariant="indigo"
                extraSnippet={
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-mono">
                    <span>Zetium A: <strong>{dayRecord.wdxrf.zetiumA.total} runs</strong></span>
                    <span>•</span>
                    <span>Zetium B: <strong>{dayRecord.wdxrf.zetiumB.total} runs</strong></span>
                    <span>•</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                      PT GTS (Sister Site): {(dayRecord.wdxrf.zetiumA.gts || 0) + (dayRecord.wdxrf.zetiumB.gts || 0)} runs
                    </span>
                  </div>
                }
              />

            </div>
          </div>
        )}

        {/* ================= BABAK 4: INSTRUMEN ED & WD ================= */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
                  Babak 4 dari 5
                </span>
                <span className="text-xs text-slate-400">• Spektrometri XRF</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                Kinerja Spektrometri (6 Unit EDXRF & 2 Unit WDXRF Zetium)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pemantauan utilisasi instrumen presisi dan pemisahan tegas sister site PT Gane Tambang Sentosa (GTS).
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* EDXRF */}
              <div className="p-5 rounded-2xl bg-purple-50/30 dark:bg-purple-950/20 border border-purple-200/70 dark:border-purple-900/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">EDXRF FLEET</span>
                    <h3 className="text-base font-bold text-purple-950 dark:text-purple-100">Epsilon C-H + S2 Puma</h3>
                  </div>
                  <span className="text-sm font-mono font-black text-purple-800 dark:text-purple-200 px-3 py-1 rounded-xl bg-purple-100 dark:bg-purple-900/60">
                    {dayRecord.edxrf.shift + (nightRecord?.edxrf.shift || 0)} Runs
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Eps C</span>
                    <span className="text-sm font-bold font-mono">{dayRecord.edxrf.epsC || 0}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Eps D</span>
                    <span className="text-sm font-bold font-mono">{dayRecord.edxrf.epsD || 0}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Eps E</span>
                    <span className="text-sm font-bold font-mono">{dayRecord.edxrf.epsE || 0}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Eps F</span>
                    <span className="text-sm font-bold font-mono">{dayRecord.edxrf.epsF || 0}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Eps G</span>
                    <span className="text-sm font-bold font-mono">{dayRecord.edxrf.epsG || 0}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Eps H</span>
                    <span className="text-sm font-bold font-mono">{dayRecord.edxrf.epsH || 0}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">S2 Puma</span>
                    <span className="text-sm font-bold font-mono">{dayRecord.edxrf.s2Puma || 0}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/60 font-bold">
                    <span className="text-[10px] text-purple-700 dark:text-purple-300 block">Shift Total</span>
                    <span className="text-sm font-black font-mono">{dayRecord.edxrf.shift}</span>
                  </div>
                </div>
              </div>

              {/* WDXRF */}
              <div className="p-5 rounded-2xl bg-indigo-50/30 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-900/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">WDXRF ZETIUM</span>
                    <h3 className="text-base font-bold text-indigo-950 dark:text-indigo-100">Zetium A & Zetium B (Manik Borat)</h3>
                  </div>
                  <span className="text-sm font-mono font-black text-indigo-800 dark:text-indigo-200 px-3 py-1 rounded-xl bg-indigo-100 dark:bg-indigo-900/60">
                    {(dayRecord.wdxrf.zetiumA.total || 0) + (dayRecord.wdxrf.zetiumB.total || 0)} Runs
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-indigo-900 dark:text-indigo-200 block">Zetium A</span>
                    <div className="flex justify-between text-slate-500"><span>Prod:</span><span className="font-mono font-bold">{dayRecord.wdxrf.zetiumA.prod || 0}</span></div>
                    <div className="flex justify-between text-slate-500"><span>Exp:</span><span className="font-mono font-bold">{dayRecord.wdxrf.zetiumA.exp || 0}</span></div>
                    <div className="flex justify-between text-indigo-600 font-bold">
                      <span>PT GTS:</span>
                      <span className="font-mono">{dayRecord.wdxrf.zetiumA.gts || 0}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-indigo-900 dark:text-indigo-200 block">Zetium B</span>
                    <div className="flex justify-between text-slate-500"><span>Prod:</span><span className="font-mono font-bold">{dayRecord.wdxrf.zetiumB.prod || 0}</span></div>
                    <div className="flex justify-between text-slate-500"><span>Exp:</span><span className="font-mono font-bold">{dayRecord.wdxrf.zetiumB.exp || 0}</span></div>
                    <div className="flex justify-between text-indigo-600 font-bold">
                      <span>PT GTS:</span>
                      <span className="font-mono">{dayRecord.wdxrf.zetiumB.gts || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-indigo-100/60 dark:bg-indigo-950/60 text-xs text-indigo-900 dark:text-indigo-300 font-medium">
                  Sampel PT GTS terisolasi secara analitik dan tidak mengganggu alur throughput utama tambang PT TBP.
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ================= BABAK 5: QC & PELEPASAN COA ================= */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  Babak 5 dari 5
                </span>
                <span className="text-xs text-slate-400">• Hilir & Pelepasan Resmi</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
                Kontrol Kualitas (QC) & Pelepasan Sertifikat Hasil Uji (CoA)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Verifikasi data analitik, passing rate standar CRM, dan pelepasan resmi CoA ke Mining & KSO.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* QC Verification */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Verifikasi Mutu & Duplikat QC</h3>
                  <span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-300">
                    {dayRecord.qc.finishShift + (nightRecord?.qc.finishShift || 0)} Lolos QC
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Penyelesaian Verifikasi QC</span>
                    <DailyPerformanceV2InBarCell
                      value={dayRecord.qc.finishShift + (nightRecord?.qc.finishShift || 0)}
                      maxValue={peaks.maxQcFinish}
                      colorVariant="teal"
                      unit="spl"
                      size="lg"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700 flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Sisa Antrean Verifikasi (Bal):</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                      {formatNumber(isLongShift ? dayRecord.qc.bal : (nightRecord?.qc.bal || dayRecord.qc.bal))} sampel
                    </span>
                  </div>
                </div>
              </div>

              {/* CoA Release */}
              <div className="p-5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-emerald-950 dark:text-emerald-100">Pelepasan Resmi Certificate of Analysis (CoA)</h3>
                  <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300">
                    {dayRecord.report.finishReportDay} Rilis 24 Jam
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">CoA Selesai Dirilis Hari Ini</span>
                    <DailyPerformanceV2InBarCell
                      value={dayRecord.report.finishReportDay}
                      maxValue={peaks.maxReportFinish}
                      colorVariant="emerald"
                      unit="CoA"
                      size="lg"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200/70 dark:border-slate-700 flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Sisa Antrean Laporan (Bal Report):</span>
                    <span className="font-mono font-bold text-emerald-800 dark:text-emerald-200">
                      {formatNumber(isLongShift ? dayRecord.report.bal : (nightRecord?.report.bal || dayRecord.report.bal))} laporan
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Success Callout */}
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div className="text-xs text-emerald-900 dark:text-emerald-200">
                <span className="font-bold block">Pelepasan Data Telah Terverifikasi:</span>
                Sertifikat analisis hasil uji resmi telah dikirimkan ke Departemen Mining Tambang & Smelter HPL sesuai Service Level Agreement (SLA).
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM CALLOUT & HOTKEY GUIDANCE */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-mono">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold">◄</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold">►</kbd>
              Navigasi Babak
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-mono">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold">1-5</kbd>
              Lompat Babak
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">{userPt || 'TBP'} Laboratory Briefing</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          </div>
        </div>

      </div>

      {/* BATCH MANAGER MODAL (RECEIVED & CHECKLIST FINISH) */}
      {activeBatchModalStation && (
        <DailyPerformanceV2BatchManagerModal
          isOpen={true}
          onClose={() => setActiveBatchModalStation(null)}
          date={selectedDate}
          stationKey={activeBatchModalStation.stationKey}
          stationName={activeBatchModalStation.name}
          shiftType={dayRecord ? (dayRecord.shiftType === 'LS' ? 'LS' : 'DAY') : 'DAY'}
        />
      )}

    </div>
  );
};
