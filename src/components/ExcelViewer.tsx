import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Search, FileSpreadsheet, Download, Loader2, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { Button } from './ui';

interface ExcelViewerProps {
  url: string;
  downloadUrl?: string;
  title?: string;
}

export const ExcelViewer: React.FC<ExcelViewerProps> = ({ url, downloadUrl, title }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadExcel = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Gagal mengambil berkas Excel (Status HTTP: ${response.status})`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: 'array' });
      setWorkbook(wb);
      setSheetNames(wb.SheetNames || []);
      if (wb.SheetNames && wb.SheetNames.length > 0) {
        setActiveSheet(wb.SheetNames[0]);
      }
    } catch (err: any) {
      console.error('Failed to load excel:', err);
      setError(err?.message || 'Gagal memproses berkas Excel');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (url) {
      loadExcel();
    }
  }, [url]);

  // Convert active sheet to 2D array of strings
  const sheetData = useMemo(() => {
    if (!workbook || !activeSheet || !workbook.Sheets[activeSheet]) return [];
    try {
      const ws = workbook.Sheets[activeSheet];
      const rawRows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });
      // Trim empty trailing rows
      return rawRows.filter(row => Array.isArray(row) && row.some(cell => cell !== '' && cell !== null && cell !== undefined));
    } catch (e) {
      console.error('Error parsing sheet data:', e);
      return [];
    }
  }, [workbook, activeSheet]);

  // Maximum columns in current sheet
  const maxCols = useMemo(() => {
    let max = 0;
    sheetData.forEach(row => {
      if (row.length > max) max = row.length;
    });
    return Math.min(max, 50); // Cap at 50 for safety
  }, [sheetData]);

  // Filter rows by search term
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return sheetData;
    const term = searchTerm.toLowerCase();
    return sheetData.filter(row => 
      row.some(cell => String(cell ?? '').toLowerCase().includes(term))
    );
  }, [sheetData, searchTerm]);

  const getColLetter = (index: number): string => {
    let letter = '';
    let temp = index;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  if (loading) {
    return (
      <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-8 space-y-4 text-slate-300">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-white">Memuat Data Spreadsheet Excel...</p>
          <p className="text-xs text-slate-400">Membaca lembar kerja dan menguraikan format tabel.</p>
        </div>
      </div>
    );
  }

  if (error || !workbook) {
    return (
      <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-8 space-y-4 text-slate-300 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="max-w-md space-y-1">
          <h4 className="text-sm font-bold text-white">Pratinjau Excel Tidak Dapat Dimuat</h4>
          <p className="text-xs text-slate-400">{error || 'Format berkas tidak dapat dikenali secara langsung oleh penampil dokumen.'}</p>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Button
            onClick={loadExcel}
            variant="secondary"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs h-9 px-3.5 rounded-xl"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Coba Lagi
          </Button>
          {(downloadUrl || url) && (
            <a
              href={downloadUrl || url}
              download
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh Berkas Excel
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-slate-950 text-slate-100 rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
      {/* Top Toolbar: Sheet Switcher & Search Bar */}
      <div className="bg-slate-900/95 border-b border-slate-800 p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        
        {/* Sheet Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full sm:max-w-xl">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-400 mr-1 flex items-center gap-1 shrink-0">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sheet:</span>
          </span>
          {sheetNames.map(name => (
            <button
              key={name}
              onClick={() => setActiveSheet(name)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all shrink-0 cursor-pointer border ${
                activeSheet === name
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Search & Stats */}
        <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari dalam sheet ini..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-colors font-mono"
            />
          </div>

          <span className="text-[11px] font-mono text-slate-400 hidden md:inline-block px-2 py-1 bg-slate-800/80 border border-slate-700 rounded-lg shrink-0">
            {filteredRows.length} Baris • {maxCols} Kolom
          </span>
        </div>
      </div>

      {/* Spreadsheet Grid View */}
      <div className="flex-1 w-full overflow-auto bg-slate-950 scrollbar-thin scrollbar-thumb-slate-700">
        {filteredRows.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-mono">
            {searchTerm ? `Tidak ditemukan data yang cocok dengan kata kunci "${searchTerm}"` : 'Lembar kerja ini kosong'}
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs font-mono select-text min-w-max">
            {/* Header Row: Column Letters (A, B, C, ...) */}
            <thead className="sticky top-0 z-10 bg-slate-900 border-b border-slate-700 shadow-xs">
              <tr>
                <th className="w-12 px-2 py-1.5 text-center text-[10px] text-slate-400 font-bold border-r border-slate-800 bg-slate-900 sticky left-0 z-20">
                  #
                </th>
                {Array.from({ length: maxCols }).map((_, idx) => (
                  <th
                    key={idx}
                    className="px-3 py-1.5 text-center text-[10px] text-emerald-400 font-bold border-r border-slate-800 min-w-[120px] max-w-[280px]"
                  >
                    {getColLetter(idx)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredRows.map((row, rIdx) => {
                const isHeaderLike = rIdx === 0 && !searchTerm;
                return (
                  <tr
                    key={rIdx}
                    className={`hover:bg-slate-800/60 transition-colors ${
                      isHeaderLike ? 'bg-slate-900/80 font-bold text-white' : 'text-slate-200'
                    }`}
                  >
                    {/* Row Number */}
                    <td className="w-12 px-2 py-1.5 text-center text-[10px] text-slate-400 font-bold border-r border-slate-800 bg-slate-900/90 sticky left-0 z-10">
                      {rIdx + 1}
                    </td>

                    {/* Row Cells */}
                    {Array.from({ length: maxCols }).map((_, cIdx) => {
                      const val = row[cIdx];
                      const displayVal = val === null || val === undefined ? '' : String(val);
                      const isMatch = searchTerm && displayVal.toLowerCase().includes(searchTerm.toLowerCase());

                      return (
                        <td
                          key={cIdx}
                          className={`px-3 py-1.5 border-r border-slate-800/60 text-xs whitespace-pre-wrap break-words max-w-sm ${
                            isMatch ? 'bg-amber-500/20 text-amber-200 font-bold' : ''
                          }`}
                        >
                          {displayVal}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Grid Footer Bar */}
      <div className="bg-slate-900 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-[11px] text-slate-400 font-mono shrink-0">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Sheet Aktif: <strong>{activeSheet}</strong> ({sheetNames.length} Sheet)</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Menampilkan {filteredRows.length} dari {sheetData.length} baris</span>
          {(downloadUrl || url) && (
            <a
              href={downloadUrl || url}
              download
              className="text-emerald-400 hover:text-emerald-300 font-bold underline flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh .xlsx
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
