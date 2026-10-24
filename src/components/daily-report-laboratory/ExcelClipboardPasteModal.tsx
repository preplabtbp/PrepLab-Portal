import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, Clipboard, ClipboardCheck, Trash2, CheckCircle2, 
  AlertCircle, X, Check, ArrowRight, Eye, Layers, Flame, Cpu, 
  FileText, Activity
} from 'lucide-react';
import { 
  parseExcelClipboardData, 
  ParsedClipboardResult, 
  ParsedStationData,
  StandardTableRow,
  MonitoringBeadRow
} from './excelClipboardParser';

interface ExcelClipboardPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyData: (result: ParsedClipboardResult, selectedStations: string[]) => void;
}

const STATION_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  weighing: { label: '1. Weighing', icon: <Flame className="w-4 h-4 text-amber-600" />, color: 'amber' },
  fused: { label: '2. Fusion (Bead)', icon: <Flame className="w-4 h-4 text-orange-600" />, color: 'orange' },
  wdxrf: { label: '3. WD-XRF', icon: <Cpu className="w-4 h-4 text-indigo-600" />, color: 'indigo' },
  qc_data: { label: '4. QC Data', icon: <Activity className="w-4 h-4 text-teal-600" />, color: 'teal' },
  press: { label: '5. Press Powder', icon: <Layers className="w-4 h-4 text-emerald-600" />, color: 'emerald' },
  edxrf: { label: '6. ED-XRF (Epsilon)', icon: <Cpu className="w-4 h-4 text-cyan-600" />, color: 'cyan' },
  monitoring_bead: { label: '7. Monitoring Bead', icon: <Eye className="w-4 h-4 text-rose-600" />, color: 'rose' },
  loi: { label: '8. LOI (Furnace)', icon: <Flame className="w-4 h-4 text-red-600" />, color: 'red' }
};

export const ExcelClipboardPasteModal: React.FC<ExcelClipboardPasteModalProps> = ({
  isOpen,
  onClose,
  onApplyData
}) => {
  const [pastedText, setPastedText] = useState<string>('');
  const [selectedStationKeys, setSelectedStationKeys] = useState<string[]>([]);
  const [activePreviewStation, setActivePreviewStation] = useState<string>('');
  const [pasteSuccessNotice, setPasteSuccessNotice] = useState<boolean>(false);

  // Parse secara reaktif saat pastedText berubah
  const parseResult = useMemo((): ParsedClipboardResult => {
    return parseExcelClipboardData(pastedText);
  }, [pastedText]);

  // Update selected stations setiap kali hasil parsing berubah
  React.useEffect(() => {
    const keys = Object.keys(parseResult.stations);
    setSelectedStationKeys(keys);
    if (keys.length > 0 && (!activePreviewStation || !keys.includes(activePreviewStation))) {
      setActivePreviewStation(keys[0]);
    }
  }, [parseResult]);

  if (!isOpen) return null;

  const handleReadClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setPastedText(text);
          setPasteSuccessNotice(true);
          setTimeout(() => setPasteSuccessNotice(false), 2500);
        }
      }
    } catch (e) {
      console.warn('Gagal membaca clipboard langsung:', e);
    }
  };

  const handleClear = () => {
    setPastedText('');
    setSelectedStationKeys([]);
    setActivePreviewStation('');
  };

  const toggleSelectStation = (key: string) => {
    setSelectedStationKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleApply = () => {
    if (selectedStationKeys.length === 0) return;
    onApplyData(parseResult, selectedStationKeys);
    onClose();
  };

  const detectedStationsList = Object.keys(parseResult.stations);
  const activeStationData = parseResult.stations[activePreviewStation];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="px-6 py-4.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Smart Paste Data Excel
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Auto-Detect 8 Stasiun
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Salin (Copy) satu tabel atau blok seluruh tabel di Excel sekaligus, lalu tempelkan di bawah.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Action Bar Input Paste */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Clipboard className="w-3.5 h-3.5 text-slate-500" />
                Area Paste Teks Excel (TSV / Clipboard):
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReadClipboard}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium text-[11px] flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  <span>Ambil dari Clipboard</span>
                </button>
                {pastedText && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 font-medium text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Bersihkan</span>
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <textarea
                value={pastedText}
                onChange={e => setPastedText(e.target.value)}
                placeholder="Klik di sini lalu tekan Ctrl + V (Paste) data dari file Excel..."
                rows={pastedText ? 4 : 5}
                className="w-full p-3.5 text-xs font-mono rounded-2xl bg-slate-50/50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all resize-y"
              />
              {pasteSuccessNotice && (
                <div className="absolute top-2 right-2 px-2.5 py-1 rounded-md bg-emerald-600 text-white text-[11px] font-bold shadow-md flex items-center gap-1 animate-in fade-in">
                  <Check className="w-3.5 h-3.5" />
                  <span>Berhasil Ditempel!</span>
                </div>
              )}
            </div>
          </div>

          {/* Status Deteksi Stasiun */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                Status Deteksi Stasiun ({detectedStationsList.length} dari 8 Terdeteksi):
              </span>
              {detectedStationsList.length > 0 && (
                <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {selectedStationKeys.length} dipilih untuk diterapkan
                </span>
              )}
            </div>

            {/* Grid 8 Stasiun Resmi */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(STATION_META).map(([key, meta]) => {
                const isDetected = Boolean(parseResult.stations[key]);
                const isSelected = selectedStationKeys.includes(key);
                const stationData = parseResult.stations[key];

                return (
                  <div
                    key={key}
                    onClick={() => {
                      if (isDetected) {
                        toggleSelectStation(key);
                        setActivePreviewStation(key);
                      }
                    }}
                    className={`p-2.5 rounded-2xl border text-left transition-all ${
                      isDetected
                        ? isSelected
                          ? 'bg-emerald-50/80 border-emerald-300 text-slate-900 shadow-2xs cursor-pointer'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 cursor-pointer'
                        : 'bg-slate-50/50 border-slate-200/60 text-slate-400 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        {meta.icon}
                        <span className="text-xs font-bold truncate">
                          {meta.label}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={!isDetected}
                        onChange={() => toggleSelectStation(key)}
                        onClick={e => e.stopPropagation()}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer disabled:cursor-not-allowed"
                      />
                    </div>

                    {isDetected && stationData ? (
                      <div className="text-[10px] space-y-0.5 font-mono">
                        {key === 'monitoring_bead' ? (
                          <div className="flex items-center justify-between text-slate-600">
                            <span>Jadi: <strong className="text-slate-900">{stationData.totals.jadi || 0}</strong></span>
                            <span>RA: <strong className="text-rose-700">{stationData.totals.ra || 0}</strong></span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-slate-600">
                            <span>In: <strong className="text-teal-700">{stationData.totals.received || 0}</strong></span>
                            <span>Fin: <strong className="text-emerald-700">{stationData.totals.finished || 0}</strong></span>
                            <span>Bal: <strong className="text-rose-700">{stationData.totals.balance || 0}</strong></span>
                          </div>
                        )}
                        <span className="text-[9px] text-emerald-700 font-bold block pt-0.5">
                          ✓ {stationData.rows.length} sampel terbaca
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic block">
                        Tidak ada di teks paste
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pratinjau Rincian Tabel yang Sedang Dipilih */}
          {activeStationData && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-bold text-slate-800">
                    Pratinjau Rincian: {activeStationData.title} ({activeStationData.rows.length} Sampel)
                  </h4>
                </div>
                {/* Selector Tab Stasiun Lain yang Terdeteksi */}
                <div className="flex items-center gap-1 overflow-x-auto max-w-[50%]">
                  {detectedStationsList.map(k => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setActivePreviewStation(k)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer whitespace-nowrap ${
                        activePreviewStation === k
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {STATION_META[k]?.label || k}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tabel Mini Data Sampel */}
              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                <table className="w-full text-[11px] text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-100/90 backdrop-blur-xs text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-1.5">SAMPLE</th>
                      {activeStationData.stationKey === 'monitoring_bead' ? (
                        <>
                          <th className="px-3 py-1.5 text-center">JADI</th>
                          <th className="px-3 py-1.5 text-center">REJECT</th>
                          <th className="px-3 py-1.5 text-center">RA</th>
                        </>
                      ) : (
                        <>
                          <th className="px-3 py-1.5 text-center">OUTSTANDING</th>
                          <th className="px-3 py-1.5 text-center">RECEIVED</th>
                          <th className="px-3 py-1.5 text-center">FINISHED</th>
                          <th className="px-3 py-1.5 text-center">BALANCE</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                    {activeStationData.rows.map((row, idx) => {
                      const isBead = activeStationData.stationKey === 'monitoring_bead';
                      const stdRow = row as StandardTableRow;
                      const beadRow = row as MonitoringBeadRow;

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-3 py-1 font-sans font-bold text-slate-800">
                            {row.sample}
                          </td>
                          {isBead ? (
                            <>
                              <td className="px-3 py-1 text-center font-bold text-emerald-700">{beadRow.jadi}</td>
                              <td className="px-3 py-1 text-center text-slate-500">{beadRow.reject}</td>
                              <td className="px-3 py-1 text-center text-rose-600 font-semibold">{beadRow.ra}</td>
                            </>
                          ) : (
                            <>
                              <td className="px-3 py-1 text-center text-slate-500">{stdRow.outstanding}</td>
                              <td className="px-3 py-1 text-center text-teal-700 font-semibold">{stdRow.received}</td>
                              <td className="px-3 py-1 text-center text-emerald-700 font-bold">{stdRow.finished}</td>
                              <td className="px-3 py-1 text-center text-rose-600 font-bold">{stdRow.balance}</td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                    {/* Baris Total */}
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-900">
                      <td className="px-3 py-1.5 font-sans">TOTAL</td>
                      {activeStationData.stationKey === 'monitoring_bead' ? (
                        <>
                          <td className="px-3 py-1.5 text-center text-emerald-800">{activeStationData.totals.jadi || 0}</td>
                          <td className="px-3 py-1.5 text-center text-slate-700">{activeStationData.totals.reject || 0}</td>
                          <td className="px-3 py-1.5 text-center text-rose-700">{activeStationData.totals.ra || 0}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-1.5 text-center">{activeStationData.totals.outstanding || 0}</td>
                          <td className="px-3 py-1.5 text-center text-teal-800">{activeStationData.totals.received || 0}</td>
                          <td className="px-3 py-1.5 text-center text-emerald-800">{activeStationData.totals.finished || 0}</td>
                          <td className="px-3 py-1.5 text-center text-rose-700">{activeStationData.totals.balance || 0}</td>
                        </>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Catatan Ekstra jika ada (VER & STD, RA, RR, dll) */}
              {activeStationData.extras && (
                <div className="flex items-center gap-3 text-[11px] font-mono text-slate-600 pt-1">
                  {activeStationData.extras.verStd !== undefined && (
                    <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-900">
                      VER & STD: <strong>{activeStationData.extras.verStd}</strong>
                    </span>
                  )}
                  {activeStationData.extras.ra !== undefined && (
                    <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900">
                      RA: <strong>{activeStationData.extras.ra}</strong>
                    </span>
                  )}
                  {activeStationData.extras.rr !== undefined && (
                    <span className="px-2 py-0.5 rounded bg-purple-50 border border-purple-200 text-purple-900">
                      RR: <strong>{activeStationData.extras.rr}</strong>
                    </span>
                  )}
                  {activeStationData.extras.raLoi !== undefined && (
                    <span className="px-2 py-0.5 rounded bg-red-50 border border-red-200 text-red-900">
                      RA LOI: <strong>{activeStationData.extras.raLoi}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {selectedStationKeys.length > 0 ? (
              <span>
                Akan menerapkan data untuk <strong className="text-slate-900">{selectedStationKeys.length} stasiun</strong> ke laporan shift aktif.
              </span>
            ) : (
              <span className="text-amber-700 font-medium">
                Pilih minimal 1 stasiun untuk diterapkan.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={selectedStationKeys.length === 0}
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <span>Terapkan ke Laporan ({selectedStationKeys.length})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
