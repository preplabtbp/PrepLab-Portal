import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Clipboard, 
  Sparkles, 
  FileSpreadsheet, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  Percent, 
  Activity, 
  Gauge, 
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { ScreenTestRecord, ScreenTestStats } from './screen-test-types';
import { 
  calculateScreenTestStats, 
  getSampleMockData, 
  exportToExcel 
} from './screen-test-utils';
import { ScreenTestChart } from './ScreenTestChart';
import { ScreenTestTable } from './ScreenTestTable';
import { ScreenTestPasteModal } from './ScreenTestPasteModal';

interface ScreenTestSmelterScreenProps {
  onBack?: () => void;
  inspectorNik?: string;
  inspectorName?: string;
}

const STORAGE_KEY = 'preplab_screen_test_smelter_records';
const SPEC_STORAGE_KEY = 'preplab_screen_test_spec_limit';
const SHOW_CHART_KEY = 'preplab_screen_test_show_chart';

export const ScreenTestSmelterScreen: React.FC<ScreenTestSmelterScreenProps> = ({
  onBack,
  inspectorNik,
  inspectorName,
}) => {
  // State: Specification limit (Min Passed %, default 95.00%)
  const [specLimit, setSpecLimit] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(SPEC_STORAGE_KEY);
      return saved ? parseFloat(saved) || 95.00 : 95.00;
    } catch {
      return 95.00;
    }
  });

  // State: Toggle whether chart is shown or hidden (management preference)
  const [showChart, setShowChart] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(SHOW_CHART_KEY);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // State: Dataset records
  const [records, setRecords] = useState<ScreenTestRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load screen test from localStorage', e);
    }
    return getSampleMockData();
  });

  // Modal state
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }
  }, [records]);

  useEffect(() => {
    try {
      localStorage.setItem(SPEC_STORAGE_KEY, String(specLimit));
    } catch {}
  }, [specLimit]);

  useEffect(() => {
    try {
      localStorage.setItem(SHOW_CHART_KEY, String(showChart));
    } catch {}
  }, [showChart]);

  // Recalculate stats
  const stats: ScreenTestStats = useMemo(() => {
    return calculateScreenTestStats(records, specLimit);
  }, [records, specLimit]);

  // Handle Import from Paste Modal
  const handleImportRecords = (newRecords: ScreenTestRecord[], mode: 'replace' | 'append') => {
    if (mode === 'replace') {
      setRecords(newRecords);
    } else {
      setRecords(prev => [...prev, ...newRecords]);
    }
  };

  // Handle single row delete
  const handleDeleteRecord = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
    toast.success('Sampel berhasil dihapus');
  };

  // Handle clear all
  const handleClearAll = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus semua data sampel?')) {
      setRecords([]);
      toast.info('Semua data sampel telah dibersihkan');
    }
  };

  // Handle add record manually
  const handleAddRecord = (record: ScreenTestRecord) => {
    setRecords(prev => [record, ...prev]);
    toast.success('Sampel baru berhasil ditambahkan');
  };

  // Reset to default sample mock data
  const handleResetToDemo = () => {
    const demo = getSampleMockData();
    setRecords(demo);
    toast.success(`Berhasil memuat ulang ${demo.length} data sampel HPL Smelter!`);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* Screen Header - Clean Light Corporate Theme */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3 transition-all shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left Brand & Title */}
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                title="Kembali ke Beranda"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600 shadow-xs" />
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Screen Test Sample Smelter HPL
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-50 text-teal-800 border border-teal-200">
                  Ayakan 200 Mesh
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Rekapitulasi pengujian ayakan 200 mesh dan kalkulasi kepatuhan spesifikasi
              </p>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Primary Paste Button */}
            <button
              type="button"
              onClick={() => setIsPasteModalOpen(true)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Clipboard className="w-4 h-4" />
              <span>Paste Data Excel</span>
            </button>

            {/* Toggle Show/Hide Chart */}
            <button
              type="button"
              onClick={() => setShowChart(!showChart)}
              className={`px-3 py-2 border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                showChart
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {showChart ? <EyeOff className="w-3.5 h-3.5 text-blue-600" /> : <Eye className="w-3.5 h-3.5 text-slate-500" />}
              <span>{showChart ? 'Sembunyikan Grafik' : 'Tampilkan Grafik'}</span>
            </button>

            {/* Load Demo */}
            <button
              type="button"
              onClick={handleResetToDemo}
              title="Muat contoh data pengujian smelter"
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Muat Demo</span>
            </button>

            {/* Export Excel */}
            <button
              type="button"
              onClick={() => exportToExcel(records)}
              disabled={records.length === 0}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-5 flex-1">
        {/* Top Control Bar & Spec Threshold */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 font-medium">Batas Minimum Standar (Min Passed):</span>
            <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-300 font-mono text-xs text-slate-900 font-bold">
              <span>&ge;</span>
              <input
                type="number"
                step="0.1"
                min="50"
                max="100"
                value={specLimit}
                onChange={(e) => setSpecLimit(parseFloat(e.target.value) || 95.00)}
                className="w-14 bg-transparent text-slate-900 font-mono font-bold focus:outline-none"
              />
              <span>%</span>
            </div>
            <span className="text-[11px] text-slate-500 hidden md:inline">
              (Standar kelulusan pengujian ayakan adalah 95.00%)
            </span>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            PT Trimegah Bangun Persada • PT Gane Permai Sentosa (Harita Nickel)
          </div>
        </div>

        {/* Enterprise KPI Summary Cards - Clean Light Corporate Style */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          {/* Card 1: Total Samples */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Sampel</span>
              <Activity className="w-4 h-4 text-slate-600" />
            </div>
            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 tracking-tight">
                {stats.totalCount}
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                {records.length > 0 ? `#${records[0].no ?? 1} s/d #${records[records.length - 1].no ?? records.length}` : '0 sampel'}
              </span>
            </div>
          </div>

          {/* Card 2: Pass Rate */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tingkat Lolos</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-700 tracking-tight">
                {stats.passRate}%
              </div>
              <span className="text-[11px] text-emerald-700 font-medium">
                {stats.passCount} dari {stats.totalCount} sampel (&ge; {specLimit}%)
              </span>
            </div>
          </div>

          {/* Card 3: Out of Spec */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Out of Spec</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-black font-mono text-rose-600 tracking-tight">
                {stats.failRate}%
              </div>
              <span className="text-[11px] text-rose-700 font-medium">
                {stats.failCount} sampel reject (&lt; {specLimit}%)
              </span>
            </div>
          </div>

          {/* Card 4: Mean Passed % */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rata-rata (X&#772;)</span>
              <Percent className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-black font-mono text-blue-700 tracking-tight">
                {stats.meanPassed}%
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Min: {stats.minPassedValue}% • Max: {stats.maxPassedValue}%
              </span>
            </div>
          </div>

          {/* Card 5: Std Dev & Process Capability Cpk */}
          <div className="col-span-2 md:col-span-1 bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cpk &amp; &sigma;</span>
              <Gauge className="w-4 h-4 text-purple-600" />
            </div>
            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-black font-mono text-purple-700 tracking-tight">
                Cpk: {stats.cpk}
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                &sigma;: &plusmn;{stats.stdDev}%
              </span>
            </div>
          </div>
        </div>

        {/* CONDITIONAL SCATTER CHART (LIGHT THEME) */}
        {showChart && (
          <ScreenTestChart
            records={records}
            stats={stats}
            specLimit={specLimit}
          />
        )}

        {/* PRIMARY EXCEL-STYLE DATA TABLE */}
        <ScreenTestTable
          records={records}
          onDeleteRecord={handleDeleteRecord}
          onClearAll={handleClearAll}
          onAddRecord={handleAddRecord}
          specLimit={specLimit}
        />
      </main>

      {/* Smart Copy Paste Modal */}
      <ScreenTestPasteModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        onImport={handleImportRecords}
      />
    </div>
  );
};
export default ScreenTestSmelterScreen;
