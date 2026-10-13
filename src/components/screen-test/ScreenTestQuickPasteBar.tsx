import React, { useState, useRef } from 'react';
import { 
  Clipboard, 
  Plus, 
  RotateCcw, 
  CheckCircle2, 
  Sparkles, 
  X,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { ScreenTestRecord } from './screen-test-types';
import { parseExcelClipboardData } from './screen-test-utils';

interface ScreenTestQuickPasteBarProps {
  onImport: (newRecords: ScreenTestRecord[], mode: 'append' | 'replace') => void;
  specLimit: number;
  datasetName: string;
}

export const ScreenTestQuickPasteBar: React.FC<ScreenTestQuickPasteBarProps> = ({
  onImport,
  specLimit,
  datasetName,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [pastedText, setPastedText] = useState('');
  const [parsedRows, setParsedRows] = useState<ScreenTestRecord[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Parse whenever text changes
  const handleTextChange = (text: string) => {
    setPastedText(text);
    if (!text.trim()) {
      setParsedRows([]);
      return;
    }
    const res = parseExcelClipboardData(text, specLimit);
    setParsedRows(res.records);
  };

  // Direct clipboard read
  const handleReadClipboard = async () => {
    try {
      if (!navigator.clipboard) {
        textareaRef.current?.focus();
        toast.info('Silakan tekan Ctrl+V pada kotak teks.');
        return;
      }
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        toast.error('Clipboard kosong atau belum ada data yang di-copy dari Excel');
        return;
      }
      handleTextChange(text);
      toast.success('Data berhasil diambil dari clipboard!');
    } catch {
      textareaRef.current?.focus();
      toast.info('Silakan klik di kotak dan tekan Ctrl+V langsung.');
    }
  };

  // Confirm import
  const handleApply = (mode: 'append' | 'replace') => {
    if (parsedRows.length === 0) {
      toast.error('Tidak ada baris sampel valid untuk dimasukkan');
      return;
    }
    onImport(parsedRows, mode);
    toast.success(
      mode === 'append' 
        ? `Berhasil menambahkan ${parsedRows.length} baris sampel ke ${datasetName}!` 
        : `Berhasil mengganti data ${datasetName} dengan ${parsedRows.length} sampel baru!`
    );
    setPastedText('');
    setParsedRows([]);
  };

  return (
    <div className="w-full bg-white rounded-xl border border-slate-300 shadow-2xs overflow-hidden transition-all">
      {/* Header bar */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-100 border border-teal-300 flex items-center justify-center text-teal-800">
            <Clipboard className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-slate-900">
                Fitur Input Cepat: Paste Baris Data Excel
              </span>
              <span className="text-[10px] bg-teal-50 text-teal-800 border border-teal-200 font-mono px-1.5 py-0.2 rounded font-semibold">
                Ctrl + V Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Copy baris tabel di Excel lalu tempel langsung ke sini untuk dataset <strong>{datasetName}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-1 text-slate-500 hover:text-slate-800"
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Content */}
      {isOpen && (
        <div className="p-3 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReadClipboard}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>Paste dari Clipboard</span>
              </button>
              <span className="text-xs text-slate-500 hidden sm:inline">
                atau klik kotak teks di bawah lalu tekan <kbd className="px-1.5 py-0.5 bg-slate-200 rounded font-mono text-[10px] text-slate-800 font-bold border border-slate-300">Ctrl + V</kbd>
              </span>
            </div>

            {pastedText && (
              <button
                type="button"
                onClick={() => { setPastedText(''); setParsedRows([]); }}
                className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Kosongkan Teks</span>
              </button>
            )}
          </div>

          {/* Direct Textarea */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              rows={3}
              value={pastedText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={`Klik di sini lalu tekan Ctrl + V...\nContoh: 266\t06/10/2026\tTBP20261005-A1\t20.00\t0.45\t19.55\t97.75%\t95.00%\tARDILA`}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white resize-y shadow-2xs"
            />
          </div>

          {/* Action and Preview Banner */}
          {parsedRows.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-slate-900">
                  {parsedRows.length} baris sampel terdeteksi:
                </span>
                <span className="text-[11px] text-slate-600 font-mono">
                  ({parsedRows.filter(r => r.isPass).length} Lolos • {parsedRows.filter(r => !r.isPass).length} Out of Spec)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleApply('append')}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambahkan ({parsedRows.length} Baris)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApply('replace')}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Ganti Semua Data</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
