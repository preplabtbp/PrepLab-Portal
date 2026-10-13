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
  EyeOff,
  Calendar,
  Layers,
  Plus,
  Filter,
  Trash2,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  ScreenTestRecord, 
  ScreenTestStats, 
  ScreenTestDataset 
} from './screen-test-types';
import { 
  calculateScreenTestStats, 
  getDefaultDatasets, 
  exportToExcel,
  filterRecordsByPeriod,
  getDistinctPeriodOptions,
  getISOWeekNumber
} from './screen-test-utils';
import { ScreenTestChart } from './ScreenTestChart';
import { ScreenTestTable } from './ScreenTestTable';
import { ScreenTestPasteModal } from './ScreenTestPasteModal';
import { ScreenTestQuickPasteBar } from './ScreenTestQuickPasteBar';
import { ScreenTestDatasetModal } from './ScreenTestDatasetModal';

interface ScreenTestSmelterScreenProps {
  onBack?: () => void;
  inspectorNik?: string;
  inspectorName?: string;
}

const DATASETS_STORAGE_KEY = 'preplab_screen_test_datasets';
const ACTIVE_DATASET_KEY = 'preplab_screen_test_active_dataset_id';
const SHOW_CHART_KEY = 'preplab_screen_test_show_chart';

export const ScreenTestSmelterScreen: React.FC<ScreenTestSmelterScreenProps> = ({
  onBack,
  inspectorNik,
  inspectorName,
}) => {
  // 1. Datasets State (HPL, RKEF, MSP, and custom datasets)
  const [datasets, setDatasets] = useState<ScreenTestDataset[]>(() => {
    const defaultList = getDefaultDatasets();
    try {
      const saved = localStorage.getItem(DATASETS_STORAGE_KEY);
      if (saved) {
        const parsed: ScreenTestDataset[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge defaults with saved to guarantee rich records for RKEF and MSP
          const merged = defaultList.map(def => {
            const existing = parsed.find(p => p.id === def.id);
            if (!existing) return def;
            // If existing has at least 8 records (user-pasted), preserve them
            if (existing.records && existing.records.length >= 8) {
              return { ...def, ...existing };
            }
            // If existing had fewer records or empty, supply rich default records
            return {
              ...def,
              ...existing,
              records: existing.records && existing.records.length > 0 ? existing.records : def.records,
            };
          });

          // Retain any custom user-added datasets
          parsed.forEach(p => {
            if (!merged.some(m => m.id === p.id)) {
              merged.push(p);
            }
          });

          return merged;
        }
      }
    } catch (e) {
      console.warn('Failed to load datasets from localStorage', e);
    }
    return defaultList;
  });

  // Active dataset ID
  const [activeDatasetId, setActiveDatasetId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_DATASET_KEY);
      return saved || 'hpl';
    } catch {
      return 'hpl';
    }
  });

  // Current active dataset
  const activeDataset = useMemo(() => {
    return datasets.find(d => d.id === activeDatasetId) || datasets[0] || {
      id: 'hpl',
      name: 'Sample Smelter HPL',
      code: 'HPL',
      specLimit: 95.00,
      records: [],
    };
  }, [datasets, activeDatasetId]);

  // Current dataset records
  const records = activeDataset.records || [];

  // Toggle show chart
  const [showChart, setShowChart] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(SHOW_CHART_KEY);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // 2. Time Filter State (Week & Month Filters seperti biasanya)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Modals state
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [isDatasetModalOpen, setIsDatasetModalOpen] = useState(false);

  // Persistence to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(DATASETS_STORAGE_KEY, JSON.stringify(datasets));
    } catch (e) {
      console.warn('Failed to save datasets to localStorage', e);
    }
  }, [datasets]);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_DATASET_KEY, activeDatasetId);
    } catch {}
  }, [activeDatasetId]);

  useEffect(() => {
    try {
      localStorage.setItem(SHOW_CHART_KEY, String(showChart));
    } catch {}
  }, [showChart]);

  // Update records of active dataset
  const updateActiveDatasetRecords = (updater: (prev: ScreenTestRecord[]) => ScreenTestRecord[]) => {
    setDatasets(prev => prev.map(ds => {
      if (ds.id === activeDataset.id) {
        return {
          ...ds,
          records: updater(ds.records || []),
        };
      }
      return ds;
    }));
  };

  // Update specLimit of active dataset
  const handleUpdateSpecLimit = (newLimit: number) => {
    setDatasets(prev => prev.map(ds => {
      if (ds.id === activeDataset.id) {
        return { ...ds, specLimit: newLimit };
      }
      return ds;
    }));
  };

  // Add new dataset
  const handleAddDataset = (newDs: ScreenTestDataset) => {
    setDatasets(prev => [...prev, newDs]);
    setActiveDatasetId(newDs.id);
    toast.success(`Dataset "${newDs.name}" berhasil ditambahkan!`);
  };

  // Delete custom dataset
  const handleDeleteDataset = (id: string) => {
    setDatasets(prev => prev.filter(d => d.id !== id));
    if (activeDatasetId === id) {
      setActiveDatasetId('hpl');
    }
    toast.info('Dataset berhasil dihapus.');
  };

  // Import records handler (append / replace)
  const handleImportRecords = (newRecords: ScreenTestRecord[], mode: 'replace' | 'append') => {
    updateActiveDatasetRecords(prev => {
      if (mode === 'replace') return newRecords;
      return [...prev, ...newRecords];
    });
  };

  // Handle single record delete
  const handleDeleteRecord = (id: string) => {
    updateActiveDatasetRecords(prev => prev.filter(r => r.id !== id));
    toast.success('Sampel berhasil dihapus');
  };

  // Handle clear all
  const handleClearAll = () => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus seluruh data pada dataset ${activeDataset.name}?`)) {
      updateActiveDatasetRecords(() => []);
      toast.info(`Data ${activeDataset.name} telah dibersihkan`);
    }
  };

  // Handle manual add record
  const handleAddRecord = (record: ScreenTestRecord) => {
    updateActiveDatasetRecords(prev => [record, ...prev]);
    toast.success('Sampel berhasil ditambahkan');
  };

  // Period options for Week and Month dropdown
  const { months: availableMonths, weeks: availableWeeks } = useMemo(() => {
    return getDistinctPeriodOptions(records);
  }, [records]);

  // Current ISO Week info
  const currentIsoWeekNum = getISOWeekNumber(new Date());

  // 3. Filter Records by Selected Period (Week / Month)
  const filteredRecords = useMemo(() => {
    return filterRecordsByPeriod(records, selectedPeriod, customStartDate, customEndDate);
  }, [records, selectedPeriod, customStartDate, customEndDate]);

  // Recalculate stats based on filtered records
  const stats: ScreenTestStats = useMemo(() => {
    return calculateScreenTestStats(filteredRecords, activeDataset.specLimit);
  }, [filteredRecords, activeDataset.specLimit]);

  // Detect if running in Embed / PowerPoint Presentation mode or iframe
  const isEmbed = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('embed') === 'true' || window.self !== window.top;
  }, []);

  return (
    <div className={`min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-teal-500 selection:text-white ${isEmbed ? 'p-2 sm:p-4' : ''}`}>
      {/* Screen Header - Executive Light Theme */}
      <header className={`sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-2.5 transition-all shadow-2xs ${isEmbed ? 'rounded-2xl border' : ''}`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left Brand & Title */}
          <div className="flex items-center gap-3">
            {onBack && !isEmbed && (
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
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Screen Test Sample Smelter
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-900 border border-blue-300">
                  {activeDataset.name}
                </span>
                {isEmbed && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    PPT Live
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Pengujian ayakan 200 mesh, rekap timbangan, dan kontrol kepatuhan spesifikasi
              </p>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle Show/Hide Chart */}
            <button
              type="button"
              onClick={() => setShowChart(!showChart)}
              className={`px-3 py-1.5 border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                showChart
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {showChart ? <EyeOff className="w-3.5 h-3.5 text-blue-600" /> : <Eye className="w-3.5 h-3.5 text-slate-500" />}
              <span>{showChart ? 'Sembunyikan Grafik' : 'Tampilkan Grafik'}</span>
            </button>

            {/* Export Excel */}
            <button
              type="button"
              onClick={() => exportToExcel(filteredRecords, `Screen_Test_${activeDataset.code}_${selectedPeriod}.xlsx`)}
              disabled={filteredRecords.length === 0}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-40"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>

            {/* Paste Modal (Advanced) */}
            <button
              type="button"
              onClick={() => setIsPasteModalOpen(true)}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Clipboard className="w-3.5 h-3.5" />
              <span>Menu Import</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-4 flex-1">
        
        {/* ═══ 1. DATASET / SAMPLE TYPE SWITCHER (HPL, RKEF, MSP, + DATASET) ═══ */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-slate-700" />
              Dataset:
            </span>

            {datasets.map((ds) => {
              const isActive = ds.id === activeDatasetId;
              return (
                <button
                  key={ds.id}
                  type="button"
                  onClick={() => {
                    setActiveDatasetId(ds.id);
                    setSelectedPeriod('all');
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-900'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                  <span>{ds.name}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                    isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {ds.records.length}
                  </span>
                </button>
              );
            })}

            {/* Add Dataset Button */}
            <button
              type="button"
              onClick={() => setIsDatasetModalOpen(true)}
              className="px-3 py-2 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100/80 border border-teal-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Dataset</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-mono">
              <span className="text-slate-400">Mesh:</span>
              <strong className="text-slate-900">{activeDataset.meshSize || '200 mesh'}</strong>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-mono">
              <span className="text-rose-400">Spek Min:</span>
              <strong className="font-bold">&ge; {activeDataset.specLimit.toFixed(2)}%</strong>
            </div>
          </div>
        </div>

        {/* ═══ 2. PERIOD FILTER BAR (BY WEEK & BY MONTH) ═══ */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-700 pr-1 border-r border-slate-200">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Filter Waktu:</span>
            </div>

            {/* Quick 1-click Filter Buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedPeriod('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  selectedPeriod === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setSelectedPeriod('this_week')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  selectedPeriod === 'this_week'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Minggu Ini
              </button>
              <button
                type="button"
                onClick={() => setSelectedPeriod('this_month')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  selectedPeriod === 'this_month'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bulan Ini
              </button>
            </div>

            {/* Comprehensive Period Dropdown */}
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 shadow-2xs cursor-pointer"
            >
              <optgroup label="⚡ Filter Cepat">
                <option value="all">📅 Semua Waktu ({records.length} Sampel)</option>
                <option value="this_week">📅 Minggu Ini (W{String(currentIsoWeekNum).padStart(2, '0')})</option>
                <option value="last_week">⏮️ Minggu Lalu</option>
                <option value="this_month">📅 Bulan Ini</option>
                <option value="last_month">⏮️ Bulan Lalu</option>
                <option value="custom">🎯 Kustom Rentang Tanggal...</option>
              </optgroup>

              {availableMonths.length > 0 && (
                <optgroup label="📅 Filter Bulanan">
                  {availableMonths.map(m => (
                    <option key={m.value} value={m.value}>
                      📅 {m.label}
                    </option>
                  ))}
                </optgroup>
              )}

              {availableWeeks.length > 0 && (
                <optgroup label="⚡ Minggu ISO (Week)">
                  {availableWeeks.map(w => (
                    <option key={w.value} value={w.value}>
                      ⚡ {w.label}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

            {/* Custom Date Range Pickers */}
            {selectedPeriod === 'custom' && (
              <div className="flex items-center gap-2 animate-in fade-in">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800"
                />
                <span className="text-slate-400">s/d</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800"
                />
              </div>
            )}
          </div>

          {/* Min Spec Limit Adjustment */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Batas Spesifikasi:</span>
            <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-300 font-mono text-xs text-slate-900 font-bold">
              <span>&ge;</span>
              <input
                type="number"
                step="0.1"
                min="50"
                max="100"
                value={activeDataset.specLimit}
                onChange={(e) => handleUpdateSpecLimit(parseFloat(e.target.value) || 95.00)}
                className="w-12 bg-transparent text-slate-900 font-mono font-bold focus:outline-none"
              />
              <span>%</span>
            </div>
          </div>
        </div>

        {/* ═══ 3. IN-PAGE QUICK PASTE BAR (Ctrl + V Langsung di Layar - Hidden in PPT Embed Mode) ═══ */}
        {!isEmbed && (
          <ScreenTestQuickPasteBar
            onImport={handleImportRecords}
            specLimit={activeDataset.specLimit}
            datasetName={activeDataset.name}
          />
        )}

        {/* ═══ 4. KPI SUMMARY CARDS (Dynamically Reacting to Selected Dataset & Period) ═══ */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          {/* Card 1: Total Samples in Period */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between border-t-4 border-t-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Sampel</span>
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 tracking-tight">
                {stats.totalCount}
              </div>
              <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
                {selectedPeriod === 'all' ? `Semua waktu (${activeDataset.code})` : 'Filter periode aktif'}
              </span>
            </div>
          </div>

          {/* Card 2: Pass Rate */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between border-t-4 border-t-emerald-500">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tingkat Lolos</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 tracking-tight">
                  {stats.passRate}%
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                  stats.passRate >= 90 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {stats.passRate >= 90 ? 'OPTIMAL' : 'PERHATIAN'}
                </span>
              </div>
              {/* Visual Micro Progress Bar */}
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, stats.passRate))}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                {stats.passCount} dari {stats.totalCount} sampel (&ge; {activeDataset.specLimit}%)
              </span>
            </div>
          </div>

          {/* Card 3: Out of Spec */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between border-t-4 border-t-rose-500">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Out of Spec</span>
              <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black font-mono text-rose-600 tracking-tight">
                  {stats.failRate}%
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                  stats.failCount === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {stats.failCount === 0 ? '0 DEFECT' : `${stats.failCount} REJECT`}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                {stats.failCount} sampel di bawah {activeDataset.specLimit}%
              </span>
            </div>
          </div>

          {/* Card 4: Mean Passed % */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between border-t-4 border-t-blue-500">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rata-rata (X&#772;)</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-black font-mono text-blue-600 tracking-tight">
                {stats.meanPassed}%
              </div>
              <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                Rentang: {stats.minPassedValue}% – {stats.maxPassedValue}%
              </span>
            </div>
          </div>

          {/* Card 5: Std Dev & Process Capability Cpk */}
          <div className="col-span-2 md:col-span-1 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between border-t-4 border-t-purple-500">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cpk &amp; &sigma;</span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                <Gauge className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black font-mono text-purple-600 tracking-tight">
                  {stats.cpk}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded font-mono bg-purple-100 text-purple-800">
                  {stats.cpk >= 1.33 ? 'CAPABLE' : stats.cpk >= 1.0 ? 'MARGINAL' : 'LOW'}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                &sigma;: &plusmn;{stats.stdDev}%
              </span>
            </div>
          </div>
        </div>

        {/* ═══ 5. SCATTER PLOT CHART (Light Theme, Pure Scatter Points, Red Spec Line) ═══ */}
        {showChart && (
          <ScreenTestChart
            key={`chart-${activeDataset.id}-${selectedPeriod}-${filteredRecords.length}-${activeDataset.specLimit}`}
            records={filteredRecords}
            stats={stats}
            specLimit={activeDataset.specLimit}
            datasetName={activeDataset.name}
            datasetCode={activeDataset.code}
            meshSize={activeDataset.meshSize}
            periodLabel={
              selectedPeriod === 'all'
                ? 'Semua Waktu'
                : selectedPeriod === 'this_week'
                ? 'Minggu Ini'
                : selectedPeriod === 'last_week'
                ? 'Minggu Lalu'
                : selectedPeriod === 'this_month'
                ? 'Bulan Ini'
                : selectedPeriod === 'last_month'
                ? 'Bulan Lalu'
                : selectedPeriod
            }
          />
        )}

        {/* ═══ 6. EXCEL-STYLE DATA TABLE ═══ */}
        <ScreenTestTable
          key={`table-${activeDataset.id}-${selectedPeriod}-${filteredRecords.length}`}
          records={filteredRecords}
          onDeleteRecord={handleDeleteRecord}
          onClearAll={handleClearAll}
          onAddRecord={handleAddRecord}
          specLimit={activeDataset.specLimit}
          datasetName={activeDataset.name}
          datasetCode={activeDataset.code}
        />
      </main>

      {/* Advanced Paste & Upload Modal */}
      <ScreenTestPasteModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        onImport={handleImportRecords}
      />

      {/* Dataset / Sample Type Management Modal */}
      <ScreenTestDatasetModal
        isOpen={isDatasetModalOpen}
        onClose={() => setIsDatasetModalOpen(false)}
        datasets={datasets}
        onAddDataset={handleAddDataset}
        onDeleteDataset={handleDeleteDataset}
        activeDatasetId={activeDatasetId}
      />
    </div>
  );
};
export default ScreenTestSmelterScreen;
