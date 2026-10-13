import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Clipboard, 
  FileSpreadsheet, 
  UploadCloud, 
  CheckCircle2, 
  Copy, 
  Sparkles, 
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import { ScreenTestRecord } from './screen-test-types';
import { 
  parseExcelClipboardData, 
  parseUploadedExcelFile, 
  generateTemplateTsv, 
  getSampleMockData 
} from './screen-test-utils';

interface ScreenTestPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (newRecords: ScreenTestRecord[], mode: 'replace' | 'append') => void;
}

export const ScreenTestPasteModal: React.FC<ScreenTestPasteModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [pasteText, setPasteText] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [parsedRecords, setParsedRecords] = useState<ScreenTestRecord[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCopiedTemplate, setIsCopiedTemplate] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    } else {
      setPasteText('');
      setParsedRecords([]);
      setWarnings([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!pasteText.trim()) {
      setParsedRecords([]);
      setWarnings([]);
      return;
    }
    const result = parseExcelClipboardData(pasteText);
    setParsedRecords(result.records);
    setWarnings(result.warnings);
  }, [pasteText]);

  const handleReadClipboard = async () => {
    try {
      if (!navigator.clipboard) {
        toast.info('Silakan tekan Ctrl+V langsung di kotak teks di bawah');
        return;
      }
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        toast.error('Clipboard kosong atau belum ada data yang di-copy');
        return;
      }
      setPasteText(text);
      toast.success('Data berhasil ditempel dari clipboard!');
    } catch {
      toast.info('Izin clipboard diblokir browser. Silakan tekan Ctrl+V langsung di kotak teks.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      toast.loading('Membaca file Excel/CSV...', { id: 'file-import' });
      const result = await parseUploadedExcelFile(file);
      setParsedRecords(result.records);
      setWarnings(result.warnings);
      setPasteText(`[File: ${file.name}] ${result.records.length} baris terdeteksi.`);
      toast.success(`Berhasil membaca ${result.records.length} sampel dari file!`, { id: 'file-import' });
    } catch (err: any) {
      toast.error('Gagal membaca file: ' + err.message, { id: 'file-import' });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLoadDemo = () => {
    const mock = getSampleMockData();
    setParsedRecords(mock);
    setWarnings([]);
    setPasteText(generateTemplateTsv());
    toast.success(`Memuat ${mock.length} contoh data sampel Smelter HPL!`);
  };

  const handleCopyTemplate = () => {
    const tsv = generateTemplateTsv();
    navigator.clipboard.writeText(tsv);
    setIsCopiedTemplate(true);
    toast.success('Format template berhasil disalin ke clipboard! Siap di-paste ke Excel.');
    setTimeout(() => setIsCopiedTemplate(false), 2000);
  };

  const handleConfirmImport = () => {
    if (parsedRecords.length === 0) {
      toast.error('Tidak ada data sampel valid untuk diimpor');
      return;
    }
    onImport(parsedRecords, importMode);
    toast.success(`Berhasil mengimpor ${parsedRecords.length} data sampel!`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-4xl max-h-[92vh] bg-white border border-slate-300 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <Clipboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Paste Data Excel Screen Test Smelter
              </h3>
              <p className="text-xs text-slate-500">
                Copy tabel di Excel lalu Paste langsung ke sini (Ctrl + V). Data langsung terisi.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Quick Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleReadClipboard}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Paste dari Clipboard</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <UploadCloud className="w-3.5 h-3.5 text-teal-600" />
                <span>Upload Excel / CSV</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                type="button"
                onClick={handleCopyTemplate}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                {isCopiedTemplate ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{isCopiedTemplate ? 'Tersalin!' : 'Copy Template Excel'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleLoadDemo}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Muat Contoh Data Smelter</span>
            </button>
          </div>

          {/* Paste Input Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                Area Paste Data (Ctrl + V):
              </label>
              {pasteText && (
                <button
                  type="button"
                  onClick={() => setPasteText('')}
                  className="text-rose-600 hover:underline cursor-pointer text-[11px]"
                >
                  Bersihkan Teks
                </button>
              )}
            </div>

            <textarea
              ref={textareaRef}
              rows={6}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={`Klik di sini lalu tekan Ctrl + V dari Excel...\nFormat kolom otomatis dikenali:\nNo | Date | ID Sample | Original Weight | Unpassed | Passed | Passed % | Min Passed | By`}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white resize-y"
            />
          </div>

          {/* Real-time Validation Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${parsedRecords.length > 0 ? 'bg-emerald-600' : 'bg-slate-400'}`} />
              <span className="text-slate-800 font-semibold">
                {parsedRecords.length > 0 
                  ? `Terdeteksi ${parsedRecords.length} sampel valid siap diimpor` 
                  : 'Menunggu data tabel dari Excel...'}
              </span>
            </div>

            {/* Mode selection */}
            <div className="flex items-center gap-3 text-xs">
              <span className="text-slate-500 font-medium">Mode Impor:</span>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-800 font-medium">
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="text-teal-600"
                />
                <span>Ganti Data Lama</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-800 font-medium">
                <input
                  type="radio"
                  name="importMode"
                  value="append"
                  checked={importMode === 'append'}
                  onChange={() => setImportMode('append')}
                  className="text-teal-600"
                />
                <span>Tambahkan (Append)</span>
              </label>
            </div>
          </div>

          {/* Live Preview Table */}
          {parsedRecords.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">
                  Pratinjau Kolom ({Math.min(5, parsedRecords.length)} dari {parsedRecords.length} baris):
                </span>
                <span className="text-[11px] text-teal-700 font-mono font-semibold">
                  {parsedRecords.filter(r => r.isPass).length} Lolos • {parsedRecords.filter(r => !r.isPass).length} Out of Spec
                </span>
              </div>

              <div className="border border-slate-300 rounded-xl overflow-x-auto max-h-44 overflow-y-auto shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-yellow-200 text-slate-900 font-bold uppercase text-[10px] font-mono sticky top-0 border-b border-slate-300">
                    <tr>
                      <th className="p-2">No</th>
                      <th className="p-2">Date</th>
                      <th className="p-2">ID Sample</th>
                      <th className="p-2 text-right">Orig (A)</th>
                      <th className="p-2 text-right">Unpassed (B)</th>
                      <th className="p-2 text-right">Passed (C)</th>
                      <th className="p-2 text-right">Passed (%)</th>
                      <th className="p-2">Min</th>
                      <th className="p-2">By</th>
                      <th className="p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    {parsedRecords.slice(0, 8).map((r, idx) => (
                      <tr key={idx} className={r.isPass ? 'hover:bg-slate-50' : 'bg-rose-50 hover:bg-rose-100'}>
                        <td className="p-2 text-slate-600">{r.no ?? idx + 1}</td>
                        <td className="p-2 text-slate-700">{r.date}</td>
                        <td className="p-2 font-bold text-slate-900">{r.sampleId}</td>
                        <td className="p-2 text-right text-slate-800">{r.originalWeight.toFixed(2)}</td>
                        <td className="p-2 text-right text-slate-800">{r.unpassedWeight.toFixed(2)}</td>
                        <td className="p-2 text-right text-slate-800">{r.passedWeight.toFixed(2)}</td>
                        <td className={`p-2 text-right font-black ${r.isPass ? 'text-slate-900' : 'text-rose-700 font-bold'}`}>
                          {r.passedPercentage.toFixed(2)}%
                        </td>
                        <td className="p-2 text-slate-600">{r.minPassed.toFixed(2)}%</td>
                        <td className="p-2 text-slate-800">{r.operator}</td>
                        <td className="p-2 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            r.isPass 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-rose-200 text-rose-900 font-bold'
                          }`}>
                            {r.isPass ? 'PASS' : 'OOS'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={parsedRecords.length === 0}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Terapkan Data ({parsedRecords.length} Sampel)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
