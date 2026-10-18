import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Download, Filter, Search, Calendar, RefreshCw, Trash2, 
  CheckCircle2, AlertTriangle, AlertCircle, FileSpreadsheet, Eye, 
  Upload, ArrowRightLeft, CheckSquare, Square, Layers, ShieldAlert,
  AlertOctagon, X, Check, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

interface XrfHistoryLogsTabProps {
  instruments: Array<{ code: string; name: string; site?: string }>;
  standards: Array<{ code: string; name: string }>;
  assignedSite?: 'GTS' | 'TBP';
  isDevOrManager?: boolean;
}

export const XrfHistoryLogsTab: React.FC<XrfHistoryLogsTabProps> = ({
  instruments,
  standards,
  assignedSite = 'GTS',
  isDevOrManager = false,
}) => {
  // Active site for instrument filtering (Default: assignedSite)
  const [activeSite, setActiveSite] = useState<'GTS' | 'TBP'>(() => assignedSite);
  useEffect(() => {
    if (assignedSite) setActiveSite(assignedSite);
  }, [assignedSite]);

  // Filtered instruments strictly by active site (prevent GTS instruments on TBP or vice-versa)
  const filteredInstruments = useMemo(() => {
    return instruments.filter(inst => {
      const isKnownGts = ['EPSILON_A', 'EPSILON_B', 'EPSILON_D', 'SUPERMINI'].includes(inst.code);
      const isKnownTbp = ['EPSILON_C', 'EPSILON_E', 'EPSILON_F', 'EPSILON_G', 'EPSILON_H', 'S2_PUMA', 'ZETIUM_A', 'ZETIUM_B'].includes(inst.code);
      const site = isKnownGts ? 'GTS' : (isKnownTbp ? 'TBP' : (inst.site || 'TBP'));
      return site === activeSite;
    });
  }, [instruments, activeSite]);

  // Filters State
  const currentYearStr = new Date().getFullYear().toString();
  const [selectedYearPreset, setSelectedYearPreset] = useState<string>(currentYearStr);
  const [selectedInstrument, setSelectedInstrument] = useState('ALL');
  const [selectedStandard, setSelectedStandard] = useState('ALL');
  const [startDate, setStartDate] = useState(`${currentYearStr}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYearStr}-12-31`);
  const [searchQuery, setSearchQuery] = useState('');
  const [batchLimit, setBatchLimit] = useState<number>(300);
  
  // View mode: 'batches' (list per verification run) vs 'samples' (continuous all rows)
  const [activeViewMode, setActiveViewMode] = useState<'samples' | 'batches'>('batches');
  
  // Data State
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Multi-selection for Bulk Operations
  const [selectedBatchIds, setSelectedBatchIds] = useState<number[]>([]);

  // Modals for Bulk Actions
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [targetInstrument, setTargetInstrument] = useState('EPSILON_A');
  const [modalScope, setModalScope] = useState<'selected' | 'filtered'>('selected');
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  // Fetch verifications from backend
  const loadBatches = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedInstrument !== 'ALL') params.set('instrumentCode', selectedInstrument);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('limit', String(batchLimit));

      const res = await fetch(`/api/xrf/verifications?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setBatches(json.data);
      }
    } catch (err: any) {
      toast.error('Gagal memuat log riwayat: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
    setSelectedBatchIds([]);
  }, [selectedInstrument, startDate, endDate, batchLimit]);

  // CSV Upload handler
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      setImporting(true);
      const loadingToast = toast.loading("Sedang memproses dan mengimpor data CSV...");
      try {
        const res = await fetch('/api/xrf/import-recap-csv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            csvContent: text, 
            targetInstrumentCode: selectedInstrument !== 'ALL' ? selectedInstrument : 'EPSILON_A' 
          })
        });
        const json = await res.json();
        toast.dismiss(loadingToast);
        if (json.success) {
          toast.success(json.message);
          loadBatches();
        } else {
          toast.error(json.error || 'Gagal mengimpor file CSV');
        }
      } catch (err: any) {
        toast.dismiss(loadingToast);
        toast.error('Error saat upload CSV: ' + err.message);
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Flatten rows for continuous table
  const flattenedRows = useMemo(() => {
    const list: any[] = [];
    batches.forEach(b => {
      if (Array.isArray(b.items)) {
        b.items.forEach((it: any) => {
          if (selectedStandard === 'ALL' || it.standardCode === selectedStandard) {
            if (
              !searchQuery ||
              (it.sampleLabel && it.sampleLabel.toLowerCase().includes(searchQuery.toLowerCase())) ||
              (b.instrumentName && b.instrumentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
              (it.standardCode && it.standardCode.toLowerCase().includes(searchQuery.toLowerCase()))
            ) {
              list.push({
                ...it,
                batchId: b.id,
                batchCode: b.batchCode,
                instrumentCode: b.instrumentCode,
                instrumentName: b.instrumentName,
                verificationDate: b.verificationDate,
                shift: b.shift,
                operatorName: b.operatorName,
              });
            }
          }
        });
      }
    });
    return list;
  }, [batches, selectedStandard, searchQuery]);

  // Available standards in current loaded batches
  const availableStandardsInBatches = useMemo(() => {
    const set = new Set<string>();
    batches.forEach(b => {
      if (Array.isArray(b.items)) {
        b.items.forEach((it: any) => {
          if (it.standardCode) set.add(it.standardCode);
        });
      }
    });
    return Array.from(set).sort();
  }, [batches]);

  // Measurement counts per standard in current loaded batches (from Gambar 2)
  const standardCountsInBatches = useMemo(() => {
    const counts: Record<string, number> = {};
    batches.forEach(b => {
      if (Array.isArray(b.items)) {
        b.items.forEach((it: any) => {
          if (it.standardCode) {
            counts[it.standardCode] = (counts[it.standardCode] || 0) + 1;
          }
        });
      }
    });
    return counts;
  }, [batches]);

  // Batch selection toggles
  const toggleSelectBatch = (id: number) => {
    if (selectedBatchIds.includes(id)) {
      setSelectedBatchIds(selectedBatchIds.filter(i => i !== id));
    } else {
      setSelectedBatchIds([...selectedBatchIds, id]);
    }
  };

  const handleSelectAllBatches = () => {
    if (selectedBatchIds.length === batches.length) {
      setSelectedBatchIds([]);
    } else {
      setSelectedBatchIds(batches.map(b => b.id));
    }
  };

  // Single batch delete
  const handleDeleteSingleBatch = async (batchId: number) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus data batch verifikasi ini? Seluruh sampel di dalamnya akan ikut terhapus.")) return;
    try {
      const res = await fetch(`/api/xrf/verifications/${batchId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast.success("Batch verifikasi berhasil dihapus");
        loadBatches();
      } else {
        toast.error(json.error || "Gagal menghapus batch");
      }
    } catch (e: any) {
      toast.error("Koneksi gagal: " + e.message);
    }
  };

  // Bulk Reassign Action (Pindahkan / Ganti Alat)
  const executeBulkReassign = async () => {
    setIsProcessingBulk(true);
    const loadingToast = toast.loading("Sedang memindahkan data alat...");
    try {
      const payload: any = {
        toInstrumentCode: targetInstrument,
      };

      if (modalScope === 'selected') {
        payload.batchIds = selectedBatchIds;
      } else {
        payload.fromInstrumentCode = selectedInstrument;
        if (startDate) payload.startDate = startDate;
        if (endDate) payload.endDate = endDate;
      }

      const res = await fetch('/api/xrf/verifications/bulk-reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      toast.dismiss(loadingToast);

      if (json.success) {
        toast.success(json.message || "Data berhasil dipindahkan.");
        setShowReassignModal(false);
        setSelectedBatchIds([]);
        loadBatches();
      } else {
        toast.error(json.error || "Gagal memindahkan data.");
      }
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error("Terjadi kesalahan: " + err.message);
    } finally {
      setIsProcessingBulk(false);
    }
  };

  // Bulk Delete Action (Hapus Sekaligus)
  const executeBulkDelete = async () => {
    setIsProcessingBulk(true);
    const loadingToast = toast.loading("Sedang menghapus data...");
    try {
      const payload: any = {};

      if (modalScope === 'selected') {
        payload.batchIds = selectedBatchIds;
      } else {
        payload.instrumentCode = selectedInstrument;
        if (startDate) payload.startDate = startDate;
        if (endDate) payload.endDate = endDate;
      }

      const res = await fetch('/api/xrf/verifications/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      toast.dismiss(loadingToast);

      if (json.success) {
        toast.success(json.message || "Batch berhasil dihapus.");
        setShowDeleteModal(false);
        setSelectedBatchIds([]);
        loadBatches();
      } else {
        toast.error(json.error || "Gagal menghapus data.");
      }
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error("Terjadi kesalahan: " + err.message);
    } finally {
      setIsProcessingBulk(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (flattenedRows.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }

    const headers = [
      "No", "XRF", "Date Of Analyzed", "Standard Sample Code",
      "% Ni", "% Co", "% Fe", "% CaO", "% SiO2", "% Al2O3", "% MgO",
      "% P", "% S", "% Cr2O3", "% MnO", "BC", "FeNi", "Sum of Conc. %", "Status"
    ];

    const rows = flattenedRows.map((r, i) => [
      i + 1,
      `"${r.instrumentName || r.instrumentCode}"`,
      `"${r.analyzedAt || r.verificationDate}"`,
      `"${r.sampleLabel || r.standardCode}"`,
      r.ni ?? '',
      r.co ?? '',
      r.fe ?? '',
      r.cao ?? '',
      r.sio2 ?? '',
      r.al2o3 ?? '',
      r.mgo ?? '',
      r.p ?? '',
      r.s ?? '',
      r.cr2o3 ?? '',
      r.mno ?? '',
      r.bc ?? '',
      r.feNi ?? '',
      r.sumConc ?? '',
      r.itemStatus || 'PASS'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekap_Verifikasi_XRF_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("File CSV berhasil diekspor!");
  };

  const selectedInstObj = instruments.find(i => i.code === selectedInstrument);

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------------- */}
      {/* 1. FILTERS & SEARCH BAR */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3">
          {/* Instrument filter */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Filter Mesin XRF
            </label>
            <select
              value={selectedInstrument}
              onChange={e => setSelectedInstrument(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="ALL">Semua Mesin XRF ({filteredInstruments.length} Alat)</option>
              {filteredInstruments.map(inst => (
                <option key={inst.code} value={inst.code}>
                  {inst.name}
                </option>
              ))}
            </select>
          </div>

          {/* Standard filter (Only standards that exist in loaded data) */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Filter Standar (CRM)
            </label>
            <select
              value={selectedStandard}
              onChange={e => setSelectedStandard(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="ALL">Semua Standar Tersedia ({availableStandardsInBatches.length})</option>
              {availableStandardsInBatches.map(code => {
                const stdObj = standards.find(s => s.code === code);
                return (
                  <option key={code} value={code}>
                    {stdObj ? stdObj.name : code}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Preset Periode */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Periode Tahun
            </label>
            <select
              value={selectedYearPreset}
              onChange={e => {
                const val = e.target.value;
                setSelectedYearPreset(val);
                if (val === 'ALL') {
                  setStartDate('');
                  setEndDate('');
                } else if (val !== 'CUSTOM') {
                  setStartDate(`${val}-01-01`);
                  setEndDate(`${val}-12-31`);
                }
              }}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value={currentYearStr}>{currentYearStr} (Tahun Berjalan)</option>
              <option value={String(Number(currentYearStr) - 1)}>{Number(currentYearStr) - 1}</option>
              <option value="ALL">Semua Waktu (All-Time)</option>
              <option value="CUSTOM">Rentang Manual</option>
            </select>
          </div>

          {/* Date range from */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => {
                setStartDate(e.target.value);
                setSelectedYearPreset('CUSTOM');
              }}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Date range to */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={e => {
                setEndDate(e.target.value);
                setSelectedYearPreset('CUSTOM');
              }}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Limit selector */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Batas Data
            </label>
            <select
              value={batchLimit}
              onChange={e => setBatchLimit(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              <option value="100">100 Batch</option>
              <option value="300">300 Batch</option>
              <option value="500">500 Batch</option>
              <option value="1000">1000 Batch</option>
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex items-end gap-1.5">
            <button
              onClick={loadBatches}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all cursor-pointer shadow-xs"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              accept=".csv,.txt" 
              className="hidden" 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              title="Import File CSV Rekap GTS / Excel"
            >
              <Upload className={`w-3.5 h-3.5 ${importing ? 'animate-bounce' : ''}`} />
              {importing ? '...' : 'Import'}
            </button>
            <button
              onClick={handleExportCSV}
              className="flex-1 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        </div>

        {/* CRM Standards Badge Strip with Counts (from Gambar 2) */}
        {Object.keys(standardCountsInBatches).length > 0 && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                Statistik CRM Terverifikasi ({Object.keys(standardCountsInBatches).length} Standar):
              </span>
              <span className="text-[10px] text-slate-400">
                Klik pil standar untuk memfilter log di bawah
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedStandard('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedStandard === 'ALL'
                    ? 'bg-teal-600 text-white border-teal-700 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                }`}
              >
                <span>Semua Standar</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-black ${selectedStandard === 'ALL' ? 'bg-teal-800 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                  {Object.values(standardCountsInBatches).reduce((a, b) => a + b, 0)}
                </span>
              </button>

              {Object.entries(standardCountsInBatches).sort((a, b) => b[1] - a[1]).map(([code, count]) => {
                const active = selectedStandard === code;
                const stdObj = standards.find(s => s.code === code);
                const displayName = stdObj?.name || (code.startsWith('OREAS') ? code.replace('OREAS', 'OREAS ') : code.startsWith('SAP') ? code.replace('SAP', 'SAP ') : code.startsWith('LIM') ? code.replace('LIM', 'LIM ') : code);

                return (
                  <button
                    key={`hist-pill-${code}`}
                    onClick={() => setSelectedStandard(active ? 'ALL' : code)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                      active
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-teal-500 font-bold shadow-md ring-2 ring-teal-500 scale-[1.02]'
                        : 'bg-black text-white dark:bg-slate-950 dark:text-white border-slate-800 hover:border-teal-500'
                    }`}
                  >
                    <span>{displayName}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-teal-400 text-slate-950 font-mono">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* QUICK REPAIR CARD JIKA SEDANG FILTER ALAT TERTENTU (MISAL EPSILON D) */}
        {/* ------------------------------------------------------------- */}
        {selectedInstrument !== 'ALL' && batches.length > 0 && (
          <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Data Terfilter: {selectedInstObj?.name || selectedInstrument} ({batches.length} Batch, {flattenedRows.length} Sampel)
                </p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  Salah menginput data ke alat ini? Anda dapat memindahkan atau menghapus seluruh data ini sekaligus.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setModalScope('filtered');
                  setShowReassignModal(true);
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Pindahkan Semua ke Alat Lain
              </button>
              <button
                onClick={() => {
                  setModalScope('filtered');
                  setShowDeleteModal(true);
                }}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus Semua Data {selectedInstObj?.name}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. FLOATING / TOP BULK ACTION BAR WHEN BATCHES SELECTED */}
      {/* ------------------------------------------------------------- */}
      {selectedBatchIds.length > 0 && (
        <div className="sticky top-20 z-20 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <CheckSquare className="w-5 h-5 text-teal-400 dark:text-teal-600" />
            <span className="text-xs font-black uppercase tracking-wider">
              {selectedBatchIds.length} Batch Terpilih
            </span>
            <span className="text-[11px] text-slate-300 dark:text-slate-600">
              (Total ~{selectedBatchIds.length * 10} Sampel)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setModalScope('selected');
                setShowReassignModal(true);
              }}
              className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Pindahkan / Ganti Alat ({selectedBatchIds.length})
            </button>
            <button
              onClick={() => {
                setModalScope('selected');
                setShowDeleteModal(true);
              }}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Hapus Terpilih ({selectedBatchIds.length})
            </button>
            <button
              onClick={() => setSelectedBatchIds([])}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 dark:bg-slate-200 dark:hover:bg-slate-300 text-slate-300 dark:text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. VIEW MODE TOGGLE & TABLE CONTAINER */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Table Top Bar */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* View Mode Pills */}
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-100 dark:bg-slate-800 text-xs">
              <button
                onClick={() => setActiveViewMode('batches')}
                className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  activeViewMode === 'batches'
                    ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Ringkasan Batch ({batches.length})
              </button>
              <button
                onClick={() => setActiveViewMode('samples')}
                className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                  activeViewMode === 'samples'
                    ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Rinci Baris Sampel ({flattenedRows.length})
              </button>
            </div>

            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500">
              <span>•</span>
              <span>{batches.length} Batch terdaftar</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari label / standar..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: BATCHES SUMMARY VIEW (IDEAL UNTUK REASSIGN & BULK DELETE) */}
        {/* ------------------------------------------------------------- */}
        {activeViewMode === 'batches' ? (
          <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold">
                  <th className="py-2.5 px-3 text-center w-10">
                    <button 
                      onClick={handleSelectAllBatches}
                      className="cursor-pointer text-slate-600 hover:text-teal-600"
                      title={selectedBatchIds.length === batches.length ? "Batalkan Semua" : "Pilih Semua Batch"}
                    >
                      {batches.length > 0 && selectedBatchIds.length === batches.length ? (
                        <CheckSquare className="w-4 h-4 text-teal-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-3 min-w-[70px]">No</th>
                  <th className="py-2.5 px-3 min-w-[140px]">Alat XRF</th>
                  <th className="py-2.5 px-3 min-w-[160px]">Tanggal & Waktu</th>
                  <th className="py-2.5 px-3 min-w-[180px]">Kode Batch</th>
                  <th className="py-2.5 px-3 text-center min-w-[90px]">Jumlah Sampel</th>
                  <th className="py-2.5 px-3 text-center min-w-[110px]">Status Evaluasi</th>
                  <th className="py-2.5 px-3 text-center min-w-[120px]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      {loading ? "Sedang memuat data..." : "Tidak ada batch verifikasi yang ditemukan."}
                    </td>
                  </tr>
                ) : (
                  batches.map((b, idx) => {
                    const isSelected = selectedBatchIds.includes(b.id);
                    const isFail = b.overallStatus === 'FAIL';
                    const isWarning = b.overallStatus === 'WARNING';
                    const statusClass = isFail 
                      ? 'bg-red-500/10 text-red-600 border border-red-500/20' 
                      : isWarning 
                      ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' 
                      : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';

                    return (
                      <tr 
                        key={`b-${b.id}`}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          isSelected ? 'bg-teal-50/50 dark:bg-teal-950/20' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center">
                          <button 
                            onClick={() => toggleSelectBatch(b.id)}
                            className="cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-teal-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                            )}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-center">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-100">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                            {b.instrumentName || b.instrumentCode}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {b.verificationDate} <span className="text-slate-400 font-mono">({b.verificationTime || '-'})</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 truncate max-w-[200px]" title={b.batchCode}>
                          {b.batchCode}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold font-mono">
                          {Array.isArray(b.items) ? b.items.length : 0} CRM
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${statusClass}`}>
                            {b.overallStatus || 'PASS'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedBatchIds([b.id]);
                                setModalScope('selected');
                                setShowReassignModal(true);
                              }}
                              className="p-1 text-slate-500 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all cursor-pointer"
                              title="Pindahkan / Ganti Alat untuk Batch Ini"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSingleBatch(b.id)}
                              className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-all cursor-pointer"
                              title="Hapus Batch Ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* ------------------------------------------------------------- */
          /* VIEW 2: CONTINUOUS SAMPLES TABLE (RINCI SEMUA BARIS) */
          /* ------------------------------------------------------------- */
          <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-fuchsia-100/90 dark:bg-fuchsia-950/90 text-fuchsia-900 dark:text-fuchsia-200 border-b border-fuchsia-200 dark:border-fuchsia-800/50 text-[11px] font-bold shadow-xs backdrop-blur-xs">
                  <th className="py-2.5 px-2 text-center w-8">No</th>
                  <th className="py-2.5 px-3 min-w-[110px]">XRF</th>
                  <th className="py-2.5 px-3 min-w-[120px]">Date Of Analyzed</th>
                  <th className="py-2.5 px-3 min-w-[130px]">Standard Sample Code</th>
                  <th className="py-2.5 px-2 text-right bg-fuchsia-200/40 dark:bg-fuchsia-900/40">% Ni</th>
                  <th className="py-2.5 px-2 text-right">% Co</th>
                  <th className="py-2.5 px-2 text-right bg-fuchsia-200/40 dark:bg-fuchsia-900/40">% Fe</th>
                  <th className="py-2.5 px-2 text-right">% CaO</th>
                  <th className="py-2.5 px-2 text-right bg-fuchsia-200/40 dark:bg-fuchsia-900/40">% SiO2</th>
                  <th className="py-2.5 px-2 text-right">% Al2O3</th>
                  <th className="py-2.5 px-2 text-right">% MgO</th>
                  <th className="py-2.5 px-2 text-right">% P</th>
                  <th className="py-2.5 px-2 text-right">% S</th>
                  <th className="py-2.5 px-2 text-right bg-fuchsia-200/40 dark:bg-fuchsia-900/40">% Cr2O3</th>
                  <th className="py-2.5 px-2 text-right">% MnO</th>
                  <th className="py-2.5 px-2 text-right font-black">BC</th>
                  <th className="py-2.5 px-2 text-right font-black">FeNi</th>
                  <th className="py-2.5 px-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                {flattenedRows.length === 0 ? (
                  <tr>
                    <td colSpan={18} className="py-12 text-center text-slate-400 font-sans">
                      {loading ? "Sedang memuat data..." : "Tidak ada baris data sampel yang cocok dengan filter."}
                    </td>
                  </tr>
                ) : (
                  flattenedRows.map((row, idx) => {
                    const isFail = row.itemStatus === 'FAIL';
                    const isWarning = row.itemStatus === 'WARNING';
                    const statusBg = isFail 
                      ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' 
                      : isWarning
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';

                    return (
                      <tr 
                        key={`hist-${idx}`} 
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                          idx % 5 === 0 && idx !== 0 ? 'border-t-2 border-slate-300 dark:border-slate-700' : ''
                        }`}
                      >
                        <td className="py-2 px-2 text-center font-bold text-slate-400 font-sans">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200 font-sans">
                          {row.instrumentName || row.instrumentCode}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {row.analyzedAt || row.verificationDate}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100 font-sans whitespace-nowrap">
                          {row.sampleLabel || row.standardCode}
                        </td>
                        <td className="py-2 px-2 text-right bg-fuchsia-50/20 dark:bg-fuchsia-950/20 font-bold">
                          {row.ni !== null ? Number(row.ni).toFixed(3) : '-'}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">
                          {row.co !== null ? Number(row.co).toFixed(3) : '-'}
                        </td>
                        <td className="py-2 px-2 text-right bg-fuchsia-50/20 dark:bg-fuchsia-950/20 font-bold">
                          {row.fe !== null ? Number(row.fe).toFixed(2) : '-'}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">
                          {row.cao !== null ? Number(row.cao).toFixed(3) : '-'}
                        </td>
                        <td className="py-2 px-2 text-right bg-fuchsia-50/20 dark:bg-fuchsia-950/20 font-bold">
                          {row.sio2 !== null ? Number(row.sio2).toFixed(2) : '-'}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">
                          {row.al2o3 !== null ? Number(row.al2o3).toFixed(2) : '-'}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">
                          {row.mgo !== null ? Number(row.mgo).toFixed(2) : '-'}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-500">
                          {row.p !== null ? Number(row.p).toFixed(3) : '-'}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">
                          {row.s !== null ? Number(row.s).toFixed(3) : '-'}
                        </td>
                        <td className="py-2 px-2 text-right bg-fuchsia-50/20 dark:bg-fuchsia-950/20 font-bold text-teal-600 dark:text-teal-400">
                          {row.cr2o3 !== null ? Number(row.cr2o3).toFixed(3) : '-'}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-400">
                          {row.mno !== null ? Number(row.mno).toFixed(2) : '-'}
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-slate-700 dark:text-slate-300">
                          {row.bc !== null ? Number(row.bc).toFixed(2) : '-'}
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-slate-700 dark:text-slate-300">
                          {row.feNi !== null ? Number(row.feNi).toFixed(2) : '-'}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold font-sans ${statusBg}`}>
                            {row.itemStatus || 'PASS'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. MODAL PINDAHKAN / GANTI ALAT (BULK REASSIGN) */}
      {/* ------------------------------------------------------------- */}
      {showReassignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl border border-teal-500/20">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Pindahkan Data ke Alat Lain
                  </h3>
                  <p className="text-xs text-slate-500">
                    Perbaiki kesalahan input alat secara massal
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReassignModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs space-y-2 border border-slate-200/80 dark:border-slate-700/80">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Cakupan Data:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {modalScope === 'selected' 
                    ? `${selectedBatchIds.length} Batch Terpilih` 
                    : `Semua Data ${selectedInstObj?.name || selectedInstrument} (${batches.length} Batch)`}
                </span>
              </div>
              {selectedInstrument !== 'ALL' && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Alat Sumber (Asal):</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {selectedInstObj?.name || selectedInstrument}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Pilih Mesin XRF Tujuan (Target Baru):
              </label>
              <select
                value={targetInstrument}
                onChange={e => setTargetInstrument(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                {instruments.map(inst => (
                  <option key={`target-${inst.code}`} value={inst.code}>
                    {inst.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Seluruh batch dan grafik kontrol akan otomatis diperbarui dan terhubung ke alat tujuan di atas.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowReassignModal(false)}
                disabled={isProcessingBulk}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={executeBulkReassign}
                disabled={isProcessingBulk}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {isProcessingBulk ? "Sedang Memindahkan..." : "Pindahkan Sekarang"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. MODAL HAPUS MASSAL (BULK DELETE) */}
      {/* ------------------------------------------------------------- */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl border border-red-500/20">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Konfirmasi Hapus Data
                  </h3>
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                    Tindakan ini tidak dapat dibatalkan
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-red-50/50 dark:bg-red-950/20 rounded-xl text-xs space-y-2 border border-red-200/80 dark:border-red-900/40 text-red-900 dark:text-red-200">
              <p className="font-semibold">
                {modalScope === 'selected' 
                  ? `Anda akan menghapus ${selectedBatchIds.length} batch verifikasi terpilih beserta seluruh item sampel di dalamnya.` 
                  : `Anda akan menghapus SELURUH data verifikasi ${selectedInstObj?.name || selectedInstrument} (${batches.length} Batch).`}
              </p>
              <p className="text-[11px] text-red-700/80 dark:text-red-400">
                Data yang dihapus akan hilang permanen dari database dan grafik kontrol.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isProcessingBulk}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={executeBulkDelete}
                disabled={isProcessingBulk}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {isProcessingBulk ? "Sedang Menghapus..." : "Ya, Hapus Sekarang"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
