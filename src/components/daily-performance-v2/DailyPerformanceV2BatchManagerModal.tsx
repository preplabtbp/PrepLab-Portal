import React, { useState, useEffect } from 'react';
import { 
  X, Plus, CheckCircle2, Circle, Layers, Trash2, 
  Sparkles, CheckSquare, Square, Building2, AlertCircle 
} from 'lucide-react';
import { toast } from 'sonner';
import { SampleBatchRecord, BatchBreakdownItem } from './daily-performance-v2-types';
import { 
  getStoredSampleBatches, 
  saveStoredSampleBatches, 
  calculateBatchBreakdown, 
  formatNumber 
} from './daily-performance-v2-utils';

interface BatchManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  stationKey: 'weighing' | 'fusion' | 'loi';
  stationName: string;
  shiftType?: 'DAY' | 'NIGHT' | 'LS';
  onBatchesUpdated?: () => void;
}

export const DailyPerformanceV2BatchManagerModal: React.FC<BatchManagerModalProps> = ({
  isOpen,
  onClose,
  date,
  stationKey,
  stationName,
  shiftType = 'DAY',
  onBatchesUpdated
}) => {
  const [batches, setBatches] = useState<SampleBatchRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'queue' | 'register'>('queue');

  // Form registration state
  const [targetPt, setTargetPt] = useState<string>('TBP');
  const [batchCountInput, setBatchCountInput] = useState<number>(4);
  const [isUniform, setIsUniform] = useState<boolean>(true);
  const [samplesPerBatch, setSamplesPerBatch] = useState<number>(24);
  const [customSamples, setCustomSamples] = useState<number[]>([24, 24, 24, 24]);

  // Load existing batches
  const reloadBatches = () => {
    const list = getStoredSampleBatches(date, stationKey);
    // If empty for this date, seed initial sample data matching realistic lab queue
    if (list.length === 0) {
      const seeded: SampleBatchRecord[] = [
        { id: `seed-1`, date, stationKey, pt: 'TBP', batchNumber: 1, sampleCount: 24, isFinished: false, shiftCreated: 'DAY' },
        { id: `seed-2`, date, stationKey, pt: 'TBP', batchNumber: 2, sampleCount: 24, isFinished: false, shiftCreated: 'DAY' },
        { id: `seed-3`, date, stationKey, pt: 'TBP', batchNumber: 3, sampleCount: 24, isFinished: false, shiftCreated: 'DAY' },
        { id: `seed-4`, date, stationKey, pt: 'TBP', batchNumber: 4, sampleCount: 24, isFinished: false, shiftCreated: 'DAY' },
        { id: `seed-5`, date, stationKey, pt: 'GPS', batchNumber: 1, sampleCount: 24, isFinished: false, shiftCreated: 'DAY' },
        { id: `seed-6`, date, stationKey, pt: 'GPS', batchNumber: 2, sampleCount: 24, isFinished: false, shiftCreated: 'DAY' },
        { id: `seed-7`, date, stationKey, pt: 'GPS', batchNumber: 3, sampleCount: 24, isFinished: false, shiftCreated: 'DAY' },
      ];
      setBatches(seeded);
      saveStoredSampleBatches(seeded);
      return;
    }
    setBatches(list);
  };

  useEffect(() => {
    if (isOpen) {
      reloadBatches();
    }
  }, [isOpen, date, stationKey]);

  // Handle batch count change to update customSamples array
  useEffect(() => {
    const count = Math.max(1, Math.min(50, batchCountInput || 1));
    setCustomSamples(prev => {
      const next = [...prev];
      while (next.length < count) next.push(samplesPerBatch || 24);
      return next.slice(0, count);
    });
  }, [batchCountInput, samplesPerBatch]);

  if (!isOpen) return null;

  // Calculations
  const finishedBatches = batches.filter(b => b.isFinished);
  const osBatches = batches.filter(b => !b.isFinished);

  const totalRegisteredSamples = batches.reduce((sum, b) => sum + b.sampleCount, 0);
  const totalFinishedSamples = finishedBatches.reduce((sum, b) => sum + b.sampleCount, 0);
  const totalOsSamples = osBatches.reduce((sum, b) => sum + b.sampleCount, 0);

  const osBreakdown = calculateBatchBreakdown(batches, false);
  const finishedBreakdown = calculateBatchBreakdown(batches, true);

  // Toggle finish on a single batch
  const handleToggleFinish = (batchId: string) => {
    const updated = batches.map(b => {
      if (b.id === batchId) {
        const nextState = !b.isFinished;
        return {
          ...b,
          isFinished: nextState,
          shiftFinished: nextState ? shiftType : undefined
        };
      }
      return b;
    });
    setBatches(updated);
    saveStoredSampleBatches(updated);
    window.dispatchEvent(new CustomEvent('preplab-batches-updated'));
    if (onBatchesUpdated) onBatchesUpdated();
  };

  // Quick action: Finish next N batches
  const handleQuickFinishCount = (count: number) => {
    let toFinish = count;
    const updated = batches.map(b => {
      if (!b.isFinished && toFinish > 0) {
        toFinish--;
        return { ...b, isFinished: true, shiftFinished: shiftType };
      }
      return b;
    });
    setBatches(updated);
    saveStoredSampleBatches(updated);
    window.dispatchEvent(new CustomEvent('preplab-batches-updated'));
    if (onBatchesUpdated) onBatchesUpdated();
    toast.success(`${count} batch telah ditandai selesai.`);
  };

  // Add new received batches
  const handleRegisterBatches = (e: React.FormEvent) => {
    e.preventDefault();
    const count = Math.max(1, batchCountInput || 1);
    const existingPtBatches = batches.filter(b => b.pt === targetPt);
    const startingBatchNum = existingPtBatches.length + 1;

    const newItems: SampleBatchRecord[] = [];
    for (let i = 0; i < count; i++) {
      const splCount = isUniform ? (samplesPerBatch || 24) : (customSamples[i] || 24);
      newItems.push({
        id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        date,
        stationKey,
        pt: targetPt,
        batchNumber: startingBatchNum + i,
        sampleCount: splCount,
        isFinished: false,
        shiftCreated: shiftType
      });
    }

    const updated = [...batches, ...newItems];
    setBatches(updated);
    saveStoredSampleBatches(updated);
    window.dispatchEvent(new CustomEvent('preplab-batches-updated'));
    if (onBatchesUpdated) onBatchesUpdated();

    toast.success(`${count} Batch ${targetPt} (${newItems.reduce((s, b) => s + b.sampleCount, 0)} spl) berhasil didaftarkan ke antrean.`);
    setActiveTab('queue');
  };

  // Delete a batch
  const handleDeleteBatch = (batchId: string) => {
    const updated = batches.filter(b => b.id !== batchId);
    setBatches(updated);
    saveStoredSampleBatches(updated);
    window.dispatchEvent(new CustomEvent('preplab-batches-updated'));
    if (onBatchesUpdated) onBatchesUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-600 to-emerald-700 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
                Stasiun {stationName}
              </span>
              <span className="text-xs text-teal-100 font-mono">• {date}</span>
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight mt-1 flex items-center gap-2">
              <Layers className="w-5 h-5 text-teal-200" />
              <span>Kelola Penerimaan Batch & Checklist Selesai</span>
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SUBHEADER TABS */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-2 gap-2">
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'queue'
                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CheckSquare className="w-4 h-4 text-teal-500" />
            <span>Antrean & Checklist Selesai ({osBatches.length} OS)</span>
          </button>

          <button
            onClick={() => setActiveTab('register')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'register'
                ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs border border-slate-200 dark:border-slate-700'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4 text-teal-500" />
            <span>+ Daftarkan Batch Baru (Received)</span>
          </button>
        </div>

        {/* SUMMARY BAR */}
        <div className="px-4 sm:px-5 py-3 bg-slate-100/70 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Received</span>
              <strong className="font-mono text-slate-800 dark:text-slate-100">{batches.length} Batch ({formatNumber(totalRegisteredSamples)} spl)</strong>
            </div>
            <div className="h-6 w-px bg-slate-300 dark:bg-slate-700" />
            <div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-bold block">Finished</span>
              <strong className="font-mono text-emerald-700 dark:text-emerald-300">{finishedBatches.length} Batch ({formatNumber(totalFinishedSamples)} spl)</strong>
            </div>
            <div className="h-6 w-px bg-slate-300 dark:bg-slate-700" />
            <div>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold block">Sisa / OS</span>
              <strong className="font-mono text-amber-700 dark:text-amber-300">{osBatches.length} Batch ({formatNumber(totalOsSamples)} spl)</strong>
            </div>
          </div>

          {/* Excel Comment Preview Pill */}
          {osBreakdown.length > 0 && (
            <div className="p-1.5 px-3 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/80 font-mono text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Memo OS: {osBreakdown.map(b => `${b.batchCount} BATCH ${b.pt}`).join(' • ')}</span>
            </div>
          )}
        </div>

        {/* BODY CONTENT */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* TAB 1: CHECKLIST & QUEUE */}
          {activeTab === 'queue' && (
            <div className="space-y-4">
              
              {/* Quick Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-500">Centang batch yang sudah selesai diproses:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleQuickFinishCount(1)}
                    disabled={osBatches.length === 0}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40 cursor-pointer"
                  >
                    + Selesai 1 Batch
                  </button>
                  <button
                    onClick={() => handleQuickFinishCount(osBatches.length)}
                    disabled={osBatches.length === 0}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 disabled:opacity-40 cursor-pointer"
                  >
                    Tandai Semua Selesai
                  </button>
                </div>
              </div>

              {/* Batch List Cards */}
              {batches.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-2">
                  <Layers className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-500">Belum ada batch yang terdaftar. Klik tab "+ Daftarkan Batch Baru" untuk menambahkan.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {batches.map((batch) => {
                    return (
                      <div
                        key={batch.id}
                        onClick={() => handleToggleFinish(batch.id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          batch.isFinished
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100 opacity-75'
                            : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:border-teal-400 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className={`p-1 rounded-lg ${batch.isFinished ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}
                          >
                            {batch.isFinished ? <CheckCircle2 className="w-5 h-5 fill-emerald-100 dark:fill-emerald-900/60" /> : <Circle className="w-5 h-5" />}
                          </button>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                batch.pt === 'TBP' ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200' : 'bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200'
                              }`}>
                                {batch.pt}
                              </span>
                              <span className="font-bold text-xs">
                                Batch #{batch.batchNumber}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 block">
                              {batch.sampleCount} Sampel {batch.isFinished ? '• Selesai' : '• Dalam Antrean'}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBatch(batch.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all"
                          title="Hapus batch ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* TAB 2: REGISTER NEW BATCHES */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterBatches} className="space-y-4">
              
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-4">
                
                {/* 1. PT Selection */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    1. Asal Perusahaan (PT):
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['TBP', 'GPS', 'Smelter'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setTargetPt(p)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          targetPt === p
                            ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        PT {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Jumlah Batch */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    2. Jumlah Batch yang Diterima:
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={batchCountInput}
                      onChange={e => setBatchCountInput(parseInt(e.target.value) || 1)}
                      className="w-28 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-sm text-center"
                    />
                    <span className="text-xs text-slate-500 font-mono">Batch</span>
                  </div>
                </div>

                {/* 3. Checkbox Kesamaan Jumlah Sampel */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isUniform}
                      onChange={e => setIsUniform(e.target.checked)}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Jumlah sampel dalam tiap batch sama (Standar Lab)
                    </span>
                  </label>

                  {/* Jika Sama (Uniform) */}
                  {isUniform ? (
                    <div className="mt-3 pl-6 flex items-center gap-2">
                      <span className="text-xs text-slate-500">Isi per batch:</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={samplesPerBatch}
                        onChange={e => setSamplesPerBatch(parseInt(e.target.value) || 24)}
                        className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-xs text-center"
                      />
                      <span className="text-xs text-slate-500 font-mono">sampel/batch</span>
                      <span className="text-xs font-bold text-teal-600 dark:text-teal-400 font-mono ml-2">
                        ➔ Subtotal: {batchCountInput * (samplesPerBatch || 24)} spl
                      </span>
                    </div>
                  ) : (
                    /* Jika Berbeda (Custom per batch) */
                    <div className="mt-3 pl-6 space-y-2">
                      <span className="text-[11px] text-slate-500 block">Masukkan jumlah sampel untuk masing-masing batch:</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {customSamples.map((count, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                            <span className="text-[10px] text-slate-400 font-mono">B{idx + 1}:</span>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={count}
                              onChange={e => {
                                const val = parseInt(e.target.value) || 0;
                                setCustomSamples(prev => {
                                  const copy = [...prev];
                                  copy[idx] = val;
                                  return copy;
                                });
                              }}
                              className="w-full px-1 py-0.5 text-center font-mono font-bold text-xs bg-transparent focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-400">spl</span>
                          </div>
                        ))}
                      </div>
                      <span className="text-xs font-bold text-teal-600 dark:text-teal-400 font-mono block mt-1">
                        ➔ Subtotal: {customSamples.reduce((a, b) => a + b, 0)} spl
                      </span>
                    </div>
                  )}
                </div>

              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md shadow-teal-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Daftarkan {batchCountInput} Batch ke Antrean ({isUniform ? batchCountInput * samplesPerBatch : customSamples.reduce((a,b)=>a+b,0)} Sampel)</span>
              </button>

            </form>
          )}

        </div>

        {/* FOOTER */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Sisa batch akan otomatis mengkalkulasi sel OS & Balance pada tabel dan tooltip.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold cursor-pointer"
          >
            Selesai
          </button>
        </div>

      </div>
    </div>
  );
};
