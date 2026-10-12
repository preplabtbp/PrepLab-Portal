import React, { useState, useEffect } from 'react';
import { 
  Download, Filter, Search, Calendar, RefreshCw, Trash2, 
  CheckCircle2, AlertTriangle, AlertCircle, FileSpreadsheet, Eye, Upload 
} from 'lucide-react';
import { toast } from 'sonner';

interface XrfHistoryLogsTabProps {
  instruments: Array<{ code: string; name: string }>;
  standards: Array<{ code: string; name: string }>;
}

export const XrfHistoryLogsTab: React.FC<XrfHistoryLogsTabProps> = ({
  instruments,
  standards,
}) => {
  const [selectedInstrument, setSelectedInstrument] = useState('ALL');
  const [selectedStandard, setSelectedStandard] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  // Fetch verifications
  const loadBatches = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedInstrument !== 'ALL') params.set('instrumentCode', selectedInstrument);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('limit', '100');

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
  }, [selectedInstrument, startDate, endDate]);

  // Flatten rows for continuous table (Gambar 2 format)
  const flattenedRows = React.useMemo(() => {
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

  // Export to CSV / Excel
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

  // Delete batch
  const handleDeleteBatch = async (batchId: number) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus data batch verifikasi ini?")) return;
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

  return (
    <div className="space-y-5">
      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Instrument filter */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Filter Mesin XRF
            </label>
            <select
              value={selectedInstrument}
              onChange={e => setSelectedInstrument(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">Semua Mesin XRF</option>
              {instruments.map(inst => (
                <option key={inst.code} value={inst.code}>
                  {inst.name}
                </option>
              ))}
            </select>
          </div>

          {/* Standard filter */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Filter Standar (CRM)
            </label>
            <select
              value={selectedStandard}
              onChange={e => setSelectedStandard(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">Semua Standar</option>
              {standards.map(std => (
                <option key={std.code} value={std.code}>
                  {std.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date range */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-end gap-2">
            <button
              onClick={loadBatches}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all"
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
              className="px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all disabled:opacity-50"
              title="Import File CSV Rekap GTS / Excel"
            >
              <Upload className={`w-4 h-4 ${importing ? 'animate-bounce' : ''}`} />
              {importing ? 'Mengimpor...' : 'Import CSV'}
            </button>
            <button
              onClick={handleExportCSV}
              className="flex-1 px-3 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Main Continuous Table (Gambar 2 Format) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-teal-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Log Rekap Verifikasi Harian (Total: {flattenedRows.length} Baris)
            </span>
          </div>
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

        <div className="overflow-x-auto max-h-[620px] overflow-y-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-fuchsia-100/90 dark:bg-fuchsia-950/90 text-fuchsia-900 dark:text-fuchsia-200 border-b border-fuchsia-200 dark:border-fuchsia-800/50 text-[11px] font-bold shadow-xs backdrop-blur-xs">
                <th className="py-2.5 px-2 text-center w-8">No</th>
                <th className="py-2.5 px-3 min-w-[110px]">XRF</th>
                <th className="py-2.5 px-3 min-w-[120px]">Date Of Analyzed</th>
                <th className="py-2.5 px-3 min-w-[160px]">Standard Sample Code</th>
                <th className="py-2.5 px-2 text-right min-w-[65px] bg-fuchsia-200/50 dark:bg-fuchsia-900/30">% Ni</th>
                <th className="py-2.5 px-2 text-right min-w-[65px]">% Co</th>
                <th className="py-2.5 px-2 text-right min-w-[70px] bg-fuchsia-200/50 dark:bg-fuchsia-900/30">% Fe</th>
                <th className="py-2.5 px-2 text-right min-w-[65px]">% CaO</th>
                <th className="py-2.5 px-2 text-right min-w-[70px] bg-fuchsia-200/50 dark:bg-fuchsia-900/30">% SiO2</th>
                <th className="py-2.5 px-2 text-right min-w-[65px]">% Al2O3</th>
                <th className="py-2.5 px-2 text-right min-w-[65px]">% MgO</th>
                <th className="py-2.5 px-2 text-right min-w-[60px]">% P</th>
                <th className="py-2.5 px-2 text-right min-w-[65px]">% S</th>
                <th className="py-2.5 px-2 text-right min-w-[70px] bg-fuchsia-200/50 dark:bg-fuchsia-900/30">% Cr2O3</th>
                <th className="py-2.5 px-2 text-right min-w-[65px]">% MnO</th>
                <th className="py-2.5 px-2 text-right min-w-[55px] font-extrabold text-blue-700 dark:text-blue-300">BC</th>
                <th className="py-2.5 px-2 text-right min-w-[55px] font-extrabold text-blue-700 dark:text-blue-300">FeNi</th>
                <th className="py-2.5 px-2 text-center min-w-[75px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
              {flattenedRows.length === 0 ? (
                <tr>
                  <td colSpan={18} className="py-8 text-center text-slate-400 font-sans">
                    {loading ? "Memuat data riwayat..." : "Belum ada data verifikasi yang cocok dengan filter."}
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
      </div>
    </div>
  );
};
