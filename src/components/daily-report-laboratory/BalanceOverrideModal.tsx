import React, { useState, useEffect } from 'react';
import { 
  X, AlertTriangle, ShieldAlert, History, UserCheck, 
  ArrowRight, FileSpreadsheet, CheckCircle2, AlertCircle,
  GitBranch, RefreshCw, Check, ArrowDown, ArrowUpRight,
  Layers, Cpu, Beaker, HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  ShiftType, 
  BalanceOverrideAuditLog,
  StationTracebackContext,
  DiscrepancyRootCauseType,
  BalanceReconciliationDetail
} from '../daily-performance-v2/daily-performance-v2-types';
import { saveBalanceAuditLog } from '../daily-performance-v2/daily-performance-v2-utils';

interface PreviousShiftSummary {
  date: string;
  shift: string;
  regu: string;
  foreman: string;
  originalBalance: number;
  intake?: number;
  finished?: number;
  stationName: string;
  upstreamStation?: string;
}

interface BalanceOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  stationKey: 'press' | 'edxrf' | 'fusion' | 'loi' | 'wdxrf' | 'qc' | 'report';
  stationName: string;
  currentValue: number;
  previousShiftInfo: PreviousShiftSummary;
  tracebackContext?: StationTracebackContext;
  currentDate: string;
  currentShift: ShiftType;
  currentRegu: string;
  availableEmployees: Array<{ nik: string; name: string }>;
  onApplyOverride?: (newValue: number, log: BalanceOverrideAuditLog) => void;
  onApplyReconciliation?: (
    newStartingBalance: number,
    reconciliationData: {
      log: BalanceOverrideAuditLog;
      rootCause: DiscrepancyRootCauseType;
      reconcilePreviousShift: boolean;
      newPreviousFinished?: number;
      newPreviousReceived?: number;
      newPreviousOs: number;
    }
  ) => void;
}

export const BalanceOverrideModal: React.FC<BalanceOverrideModalProps> = ({
  isOpen,
  onClose,
  stationKey,
  stationName,
  currentValue,
  previousShiftInfo,
  tracebackContext,
  currentDate,
  currentShift,
  currentRegu,
  availableEmployees,
  onApplyOverride,
  onApplyReconciliation
}) => {
  if (!isOpen) return null;

  // Baseline data from previous shift
  const prevDate = tracebackContext?.date || previousShiftInfo.date || 'Shift Lalu';
  const prevShift = tracebackContext?.shift || previousShiftInfo.shift || 'NIGHT';
  const prevRegu = tracebackContext?.regu || previousShiftInfo.regu || 'Regu Lalu';
  const prevForeman = tracebackContext?.foreman || previousShiftInfo.foreman || 'Foreman Shift Lalu';
  const upstreamStation = tracebackContext?.upstreamStationName || previousShiftInfo.upstreamStation || 'Stasiun Hulu';

  const prevInitialBal = tracebackContext?.initialBalance ?? 0;
  const prevIntake = tracebackContext?.receivedCount ?? (previousShiftInfo.intake || 0);
  const prevFinished = tracebackContext?.finishedCount ?? (previousShiftInfo.finished || 0);
  const prevOfficialOs = tracebackContext?.officialOs ?? (previousShiftInfo.originalBalance ?? currentValue);

  // User input states
  const [physicalCount, setPhysicalCount] = useState<number>(currentValue);
  const [rootCause, setRootCause] = useState<DiscrepancyRootCauseType>('FINISHED_MISMATCH');
  
  // Adjusted fields
  const [adjustedFinished, setAdjustedFinished] = useState<number>(() => {
    // Expected finished to match physical count: initial + intake - physical
    const calc = prevInitialBal + prevIntake - currentValue;
    return Math.max(0, calc);
  });

  const [adjustedIntake, setAdjustedIntake] = useState<number>(() => {
    // Expected intake to match physical count: physical + finished - initial
    const calc = currentValue + prevFinished - prevInitialBal;
    return Math.max(0, calc);
  });

  const [reconcilePreviousShift, setReconcilePreviousShift] = useState<boolean>(true);
  const [modifiedBy, setModifiedBy] = useState<string>(availableEmployees[0]?.name || '');
  const [customModifiedBy, setCustomModifiedBy] = useState<string>('');
  const [investigationCategory, setInvestigationCategory] = useState<string>(
    'Kekeliruan input selesai (finished) instrumen di shift sebelumnya'
  );
  const [investigationNotes, setInvestigationNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync physical count changes with adjusted values
  useEffect(() => {
    if (rootCause === 'FINISHED_MISMATCH') {
      const calcFin = prevInitialBal + prevIntake - physicalCount;
      setAdjustedFinished(Math.max(0, calcFin));
    } else if (rootCause === 'RECEIVED_MISMATCH') {
      const calcIn = physicalCount + prevFinished - prevInitialBal;
      setAdjustedIntake(Math.max(0, calcIn));
    }
  }, [physicalCount, rootCause, prevInitialBal, prevIntake, prevFinished]);

  // Variance calculation
  const variance = physicalCount - prevOfficialOs;
  const hasVariance = variance !== 0;

  // Calculated resulting OS from adjusted parameters
  const calculatedOsFromAdjusted = React.useMemo(() => {
    if (rootCause === 'FINISHED_MISMATCH') {
      return Math.max(0, (prevInitialBal + prevIntake) - adjustedFinished);
    }
    if (rootCause === 'RECEIVED_MISMATCH') {
      return Math.max(0, (prevInitialBal + adjustedIntake) - prevFinished);
    }
    return physicalCount;
  }, [rootCause, prevInitialBal, prevIntake, prevFinished, adjustedFinished, adjustedIntake, physicalCount]);

  const finalModifiedBy = modifiedBy === 'OTHER' ? customModifiedBy : modifiedBy;

  const handleSave = () => {
    if (!finalModifiedBy.trim()) {
      toast.error('Harap masukkan nama personil yang melakukan koreksi.');
      return;
    }
    if (physicalCount < 0 || isNaN(physicalCount)) {
      toast.error('Nilai fisik aktual tidak valid.');
      return;
    }

    setIsSubmitting(true);
    const nowIso = new Date().toISOString();
    const finalReason = `${investigationCategory}${investigationNotes ? `: ${investigationNotes.trim()}` : ''}`;

    const reconciliationDetail: BalanceReconciliationDetail = {
      rootCause,
      upstreamStation,
      originalIntake: prevIntake,
      correctedIntake: rootCause === 'RECEIVED_MISMATCH' ? adjustedIntake : prevIntake,
      originalFinished: prevFinished,
      correctedFinished: rootCause === 'FINISHED_MISMATCH' ? adjustedFinished : prevFinished,
      originalOs: prevOfficialOs,
      correctedOs: calculatedOsFromAdjusted,
      physicalCountAtHandover: physicalCount,
      variance,
      reconcilePreviousShiftRecord: reconcilePreviousShift
    };

    const auditLog: BalanceOverrideAuditLog = {
      id: `audit_trace_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: nowIso,
      date: currentDate,
      shift: currentShift,
      regu: currentRegu,
      stationKey,
      stationName,
      previousShiftInfo: {
        date: prevDate,
        shift: prevShift,
        regu: prevRegu,
        foreman: prevForeman,
        originalBalance: prevOfficialOs,
        intake: prevIntake,
        finished: prevFinished
      },
      originalValue: currentValue,
      correctedValue: calculatedOsFromAdjusted,
      modifiedBy: finalModifiedBy.trim(),
      reason: finalReason,
      investigationNotes: investigationNotes.trim(),
      rootCauseType: rootCause,
      reconciliationDetail,
      isBackwardReconciled: reconcilePreviousShift
    };

    saveBalanceAuditLog(auditLog);

    if (onApplyReconciliation) {
      onApplyReconciliation(calculatedOsFromAdjusted, {
        log: auditLog,
        rootCause,
        reconcilePreviousShift,
        newPreviousFinished: rootCause === 'FINISHED_MISMATCH' ? adjustedFinished : undefined,
        newPreviousReceived: rootCause === 'RECEIVED_MISMATCH' ? adjustedIntake : undefined,
        newPreviousOs: calculatedOsFromAdjusted
      });
    } else if (onApplyOverride) {
      onApplyOverride(calculatedOsFromAdjusted, auditLog);
    }

    toast.success(
      reconcilePreviousShift
        ? `Rekonsiliasi Sukses! Record Shift ${prevShift} diperbarui & Saldo Awal ${stationName} kini sinkron (${calculatedOsFromAdjusted} spl).`
        : `Saldo awal ${stationName} disesuaikan menjadi ${calculatedOsFromAdjusted} spl.`
    );
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border-b border-amber-200/50 dark:border-amber-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                Investigasi & Rekonsiliasi Saldo Awal
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Stasiun: <strong className="text-amber-700 dark:text-amber-400">{stationName}</strong> • Sumber: <span className="font-medium text-slate-600 dark:text-slate-300">{upstreamStation}</span>
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4.5 text-xs">
          
          {/* Card 1: Data Rekam & Neraca Shift Sebelumnya */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                <History className="w-4 h-4 text-slate-500" />
                Neraca Laporan Shift Sebelumnya
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-700 font-mono font-bold text-slate-700 dark:text-slate-200">
                {prevDate} • Shift {prevShift} ({prevRegu}) • Foreman: {prevForeman}
              </span>
            </div>

            {/* Formula Baris Neraca */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px]">1. Saldo Awal Lalu</span>
                <strong className="text-slate-800 dark:text-slate-200 font-mono text-sm">
                  {prevInitialBal} spl
                </strong>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px]">2. Masuk (+ Intake)</span>
                <strong className="text-emerald-700 dark:text-emerald-400 font-mono text-sm">
                  +{prevIntake} spl
                </strong>
                <span className="text-[9px] text-slate-400 block truncate">dari {upstreamStation}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px]">3. Selesai (− Finished)</span>
                <strong className="text-blue-700 dark:text-blue-400 font-mono text-sm">
                  −{prevFinished} spl
                </strong>
                <span className="text-[9px] text-slate-400 block">keluar stasiun</span>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80">
                <span className="text-amber-800 dark:text-amber-400 block text-[10px] font-bold">4. Saldo Sisa Sistem (OS)</span>
                <strong className="text-amber-950 dark:text-amber-200 font-mono text-sm">
                  = {prevOfficialOs} spl
                </strong>
                <span className="text-[9px] text-amber-700 dark:text-amber-400 block">resmi shift lalu</span>
              </div>
            </div>
          </div>

          {/* Card 2: Verifikasi Fisik Aktual & Selisih (Variance) */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-white block">
                  Jumlah Fisik Riil di Meja Saat Handover Shift
                </label>
                <span className="text-[11px] text-slate-500">
                  Hitung fisik sampel aktual di stasiun kerja saat pergantian shift
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="number"
                  min={0}
                  value={physicalCount}
                  onChange={e => setPhysicalCount(Math.max(0, Number(e.target.value)))}
                  className="w-24 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-amber-500/70 font-mono font-bold text-base text-center text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">sampel</span>
              </div>
            </div>

            {/* Indikator Status Selisih */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5 font-medium">
                {hasVariance ? (
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                )}
                Status Perbandingan:
              </span>

              {hasVariance ? (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-500">Fisik ({physicalCount}) − Sistem ({prevOfficialOs}) =</span>
                  <span className={`px-2 py-0.5 rounded-lg font-mono font-bold text-xs ${
                    variance > 0 
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' 
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                  }`}>
                    {variance > 0 ? `+${variance} spl (Surplus Fisik)` : `${variance} spl (Defisit Fisik)`}
                  </span>
                </div>
              ) : (
                <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold font-mono text-xs">
                  ✓ Klop 100% (Tidak Ada Selisih)
                </span>
              )}
            </div>
          </div>

          {/* Card 3: Wizard Penelusuran Akar Masalah (Root Cause Diagnostic) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-white block text-xs">
                Pilih Jalur Investigasi Akar Masalah (Traceback Diagnostic):
              </span>
              <span className="text-[10px] text-slate-400">
                Pilih penyebab terjadinya perbedaan angka
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Opsi 1: Kesalahan Penginputan Selesai (Finished) */}
              <label 
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer block ${
                  rootCause === 'FINISHED_MISMATCH'
                    ? 'bg-amber-500/10 border-amber-500 dark:border-amber-500/80 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input 
                    type="radio" 
                    name="rootCause" 
                    checked={rootCause === 'FINISHED_MISMATCH'}
                    onChange={() => {
                      setRootCause('FINISHED_MISMATCH');
                      setInvestigationCategory('Kekeliruan input selesai (finished) instrumen di shift sebelumnya');
                    }}
                    className="mt-1 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-slate-900 dark:text-white text-xs block">
                        Jalur A: Kesalahan Penginputan Selesai (Finished) Shift Lalu
                      </strong>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                        Paling Sering Terjadi
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Operator shift lalu mencatat hasil selesai terlalu banyak/sedikit dibandingkan yang riil selesai di instrumen (contoh: ada sampel tertahan, running reject, atau belum selesai diukur).
                    </p>

                    {rootCause === 'FINISHED_MISMATCH' && (
                      <div className="mt-2.5 p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-amber-200 dark:border-amber-800/60 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            Selesai (Finished) Shift Lalu yang Benar:
                          </span>
                          <div className="flex items-center gap-1.5">
                            <input 
                              type="number"
                              min={0}
                              value={adjustedFinished}
                              onChange={e => setAdjustedFinished(Math.max(0, Number(e.target.value)))}
                              className="w-20 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono font-bold text-center text-xs"
                            />
                            <span className="text-[10px] text-slate-400">spl</span>
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/50">
                          <span>Kalkulasi Neraca Shift Lalu Baru:</span>
                          <strong className="font-mono text-amber-700 dark:text-amber-300">
                            {prevInitialBal} + {prevIntake} − {adjustedFinished} = {calculatedOsFromAdjusted} spl
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </label>

              {/* Opsi 2: Kesalahan Penginputan Sampel Masuk (Received / Intake) */}
              <label 
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer block ${
                  rootCause === 'RECEIVED_MISMATCH'
                    ? 'bg-amber-500/10 border-amber-500 dark:border-amber-500/80 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input 
                    type="radio" 
                    name="rootCause" 
                    checked={rootCause === 'RECEIVED_MISMATCH'}
                    onChange={() => {
                      setRootCause('RECEIVED_MISMATCH');
                      setInvestigationCategory('Kekeliruan input sampel masuk (intake) dari stasiun alur hulu');
                    }}
                    className="mt-1 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="space-y-1.5 flex-1">
                    <strong className="text-slate-900 dark:text-white text-xs block">
                      Jalur B: Kesalahan Penginputan Sampel Masuk (Intake dari {upstreamStation})
                    </strong>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Stasiun alur sebelumnya ({upstreamStation}) salah mencatat pengiriman sampel ke stasiun ini, atau ada sampel titipan/kantong serbuk tambahan yang belum terdata di Intake shift lalu.
                    </p>

                    {rootCause === 'RECEIVED_MISMATCH' && (
                      <div className="mt-2.5 p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-amber-200 dark:border-amber-800/60 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            Sampel Masuk (Intake) Shift Lalu yang Benar:
                          </span>
                          <div className="flex items-center gap-1.5">
                            <input 
                              type="number"
                              min={0}
                              value={adjustedIntake}
                              onChange={e => setAdjustedIntake(Math.max(0, Number(e.target.value)))}
                              className="w-20 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono font-bold text-center text-xs"
                            />
                            <span className="text-[10px] text-slate-400">spl</span>
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/50">
                          <span>Kalkulasi Neraca Shift Lalu Baru:</span>
                          <strong className="font-mono text-emerald-700 dark:text-emerald-300">
                            {prevInitialBal} + {adjustedIntake} − {prevFinished} = {calculatedOsFromAdjusted} spl
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </label>

              {/* Opsi 3: Kesalahan Catat Fisik / Stock Opname Handover */}
              <label 
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer block ${
                  rootCause === 'PHYSICAL_COUNT_MISMATCH'
                    ? 'bg-amber-500/10 border-amber-500 dark:border-amber-500/80 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input 
                    type="radio" 
                    name="rootCause" 
                    checked={rootCause === 'PHYSICAL_COUNT_MISMATCH'}
                    onChange={() => {
                      setRootCause('PHYSICAL_COUNT_MISMATCH');
                      setInvestigationCategory('Salah catat sisa fisik di akhir shift sebelumnya (aktual di meja berbeda)');
                    }}
                    className="mt-1 text-amber-600 focus:ring-amber-500"
                  />
                  <div className="space-y-1.5 flex-1">
                    <strong className="text-slate-900 dark:text-white text-xs block">
                      Jalur C: Koreksi Fisik Langsung (Stock Opname / Selisih Fisik Murni)
                    </strong>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Intake dan Finished shift lalu sudah diverifikasi sesuai log instrumen, tetapi fisik berbeda karena human error saat hitung sisa serah terima atau sampel pecah/rusak/tercecer fisik.
                    </p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Card 4: Rekonsiliasi Mundur (Backward Synchronization) */}
          <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input 
                type="checkbox"
                checked={reconcilePreviousShift}
                onChange={e => setReconcilePreviousShift(e.target.checked)}
                className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
              />
              <div className="space-y-1">
                <span className="font-bold text-teal-900 dark:text-teal-200 block text-xs">
                  Perbarui & Rekonsiliasi Laporan Shift Sebelumnya ({prevDate} • Shift {prevShift})
                </span>
                <p className="text-[11px] text-teal-800/90 dark:text-teal-300/90 leading-tight">
                  {reconcilePreviousShift 
                    ? 'Sistem akan memperbarui record shift lalu dan menghitung ulang neracanya, sehingga data ke belakang tetap 100% konsisten dan klop dengan saldo awal shift ini.' 
                    : 'Perubahan HANYA disimpan di shift ini tanpa merekonsiliasi record shift lalu (berpotensi menimbulkan selisih data ke belakang).'}
                </p>
              </div>
            </label>
          </div>

          {/* Card 5: Personil & Catatan Investigasi */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Personil yang Melakukan Investigasi & Penggantian:
                </label>
                <select
                  value={modifiedBy}
                  onChange={e => setModifiedBy(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                >
                  {availableEmployees.map(emp => (
                    <option key={emp.nik} value={emp.name}>
                      {emp.name} ({emp.nik})
                    </option>
                  ))}
                  <option value="OTHER">+ Input Personil Lain...</option>
                </select>

                {modifiedBy === 'OTHER' && (
                  <input 
                    type="text"
                    placeholder="Ketik nama personil pengubah..."
                    value={customModifiedBy}
                    onChange={e => setCustomModifiedBy(e.target.value)}
                    className="w-full mt-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                  />
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Kategori Alasan Penggantian:
                </label>
                <select
                  value={investigationCategory}
                  onChange={e => setInvestigationCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                >
                  <option value="Kekeliruan input selesai (finished) instrumen di shift sebelumnya">
                    Kekeliruan input selesai (finished) instrumen di shift sebelumnya
                  </option>
                  <option value="Kekeliruan input sampel masuk (intake) dari stasiun alur hulu">
                    Kekeliruan input sampel masuk (intake) dari stasiun alur hulu
                  </option>
                  <option value="Salah catat sisa fisik di akhir shift sebelumnya (aktual di meja berbeda)">
                    Salah catat sisa fisik di akhir shift sebelumnya (aktual di meja berbeda)
                  </option>
                  <option value="Sampel tertahan / terlambat diserahkan dari preparasi">
                    Sampel tertahan / terlambat diserahkan dari preparasi
                  </option>
                  <option value="Lainnya (penjelasan detail pada catatan investigasi)">
                    Lainnya (penjelasan detail pada catatan investigasi)
                  </option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Catatan Investigasi Lapangan <span className="text-slate-400 font-normal">(Rekomendasi untuk audit)</span>:
              </label>
              <textarea 
                rows={2}
                placeholder="Jelaskan temuan investigasi, misal: Ditemukan 15 pelet di nampan samping EDXRF yang belum sempat di-scan oleh operator shift malam sebelum pergantian shift..."
                value={investigationNotes}
                onChange={e => setInvestigationNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs resize-none"
              />
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>Foreman Shift Lalu Terkait: <strong>{prevForeman}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan Koreksi & Rekonsiliasi Data</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
