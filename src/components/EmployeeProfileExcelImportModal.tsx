import React, { useState, useRef } from 'react';
import {
  X, UploadCloud, FileSpreadsheet, Download, CheckCircle2,
  AlertTriangle, RefreshCw, Users, Building2, ShieldCheck,
  Check, ArrowRight, Loader2, Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

export interface EmployeeProfileRow {
  no?: number | string;
  nama: string;
  nik: string;
  statusMess: string;
  pt: string;
  shift: string;
  section: string;
  tempatTinggal: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  inspectorNik?: string;
}

export function EmployeeProfileExcelImportModal({ isOpen, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<EmployeeProfileRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Unduh template contoh format Excel persis seperti referensi foto pengguna
  const handleDownloadTemplate = () => {
    const headers = [
      'NO',
      'NAMA KARYAWAN NR',
      'NIK',
      'Status Mess',
      'PT',
      'Shift',
      'Section',
      'Tempat Tinggal'
    ];

    const sampleRows = [
      [1, 'Deni Nugraha Perdiana', '04D20020842', 'CR', 'TBP', 'Nonshift', 'Laboratorium Krishna', 'Nirwana'],
      [2, 'Tigwa Anggawikara', '04D23000004', 'CR', 'TBP', 'Nonshift', 'Laboratorium Krishna', 'Nirwana'],
      [3, 'Arif Maulana Lessy', '02D24000009', 'CR', 'GPS', 'Nonshift', 'Preparasi Krishna', 'Nirwana'],
      [4, 'Khaufi Wirawan Aligora', '02D18000192', 'CR', 'GPS', 'Nonshift', 'Laboratorium Krishna', 'Nirwana'],
      [5, 'Arthur Paul Marnix Souisa', '02D21001045', 'CR', 'GPS', 'Nonshift', 'Laboratorium Krishna', 'Nirwana'],
      [6, 'Muhammad Amran Selang', '04D21001049', 'CR', 'TBP', 'A', 'Laboratorium Krishna', 'Nirwana'],
      [7, 'Sukarman A. Akil, ST', '04D21001047', 'CR', 'TBP', 'Nonshift', 'Laboratorium Krishna', 'Nirwana'],
      [8, 'Muhammad Nova Herisandi, S.Sos', '02D2500012', 'CR', 'GPS', 'Nonshift', 'Laboratorium Krishna', 'Nirwana'],
      [9, 'Janter Jaya Barimbing', '04D1900564', 'CR', 'TBP', 'B', 'Preparasi Krishna', 'Nirwana'],
      [10, 'Subrandi', '02D2200018', 'CR', 'GPS', 'A', 'Preparasi Krishna', 'Nirwana'],
      [11, 'Ryan M Rusli', '02D2300052', 'CR', 'GPS', 'B', 'Preparasi Krishna', 'Nirwana'],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 32 },
      { wch: 16 },
      { wch: 14 },
      { wch: 8 },
      { wch: 12 },
      { wch: 26 },
      { wch: 18 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Profil_Karyawan');
    XLSX.writeFile(wb, 'Format_Perbarui_Profil_Karyawan.xlsx');
  };

  // Parser file Excel (.xlsx / .xls / .csv)
  const processFile = async (selectedFile: File) => {
    setErrorMsg(null);
    setFile(selectedFile);
    setIsParsing(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error('File tidak memiliki sheet yang dapat dibaca.');

      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
      if (!rawData || rawData.length < 2) {
        throw new Error('File kosong atau tidak memiliki data baris.');
      }

      // Cari baris header (cek 5 baris pertama)
      let headerRowIdx = -1;
      let colMap: Record<string, number> = {};

      for (let r = 0; r < Math.min(6, rawData.length); r++) {
        const row = rawData[r];
        if (!Array.isArray(row)) continue;

        const currentMap: Record<string, number> = {};
        row.forEach((cellVal, cIdx) => {
          const str = String(cellVal || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (str === 'nik' || str === 'noid' || str === 'id') currentMap['nik'] = cIdx;
          else if (str.includes('namakaryawan') || str === 'nama' || str === 'name' || str === 'karyawan') currentMap['nama'] = cIdx;
          else if (str.includes('statusmess') || str === 'mess') currentMap['statusMess'] = cIdx;
          else if (str === 'pt' || str.includes('perusahaan') || str.includes('company')) currentMap['pt'] = cIdx;
          else if (str === 'shift' || str.includes('shiftkerja')) currentMap['shift'] = cIdx;
          else if (str === 'section' || str.includes('bagian') || str.includes('seksi')) currentMap['section'] = cIdx;
          else if (str.includes('tempattinggal') || str.includes('residence') || str.includes('domisili')) currentMap['tempatTinggal'] = cIdx;
          else if (str === 'no' || str === 'nomor') currentMap['no'] = cIdx;
        });

        // Header valid minimal punya NIK dan salah satu dari Nama / PT
        if (currentMap['nik'] !== undefined && (currentMap['nama'] !== undefined || currentMap['pt'] !== undefined)) {
          headerRowIdx = r;
          colMap = currentMap;
          break;
        }
      }

      if (headerRowIdx === -1) {
        throw new Error('Kolom NIK atau NAMA KARYAWAN tidak ditemukan pada header sheet. Silakan unduh format template contoh.');
      }

      const rows: EmployeeProfileRow[] = [];
      for (let r = headerRowIdx + 1; r < rawData.length; r++) {
        const row = rawData[r];
        if (!Array.isArray(row)) continue;

        const getCell = (key: string): string => {
          const idx = colMap[key];
          if (idx === undefined || row[idx] === undefined || row[idx] === null) return '';
          return String(row[idx]).trim();
        };

        const nik = getCell('nik').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const nama = getCell('nama');
        const rawPt = getCell('pt').toUpperCase();
        const pt = rawPt.includes('GPS') ? 'GPS' : rawPt.includes('TBP') ? 'TBP' : rawPt;
        const statusMess = getCell('statusMess') || 'CR';
        const shift = getCell('shift') || 'Nonshift';
        const section = getCell('section') || 'Laboratorium Krishna';
        const tempatTinggal = getCell('tempatTinggal') || 'Nirwana';
        const noVal = getCell('no');

        // Lewati baris kosong atau baris header berulang
        if (!nik || nik === 'NIK' || (!nama && !pt)) continue;

        rows.push({
          no: noVal || rows.length + 1,
          nik,
          nama,
          statusMess,
          pt,
          shift,
          section,
          tempatTinggal,
        });
      }

      if (rows.length === 0) {
        throw new Error('Tidak ada data karyawan valid yang berhasil dibaca dari file Excel.');
      }

      setParsedRows(rows);
    } catch (err: any) {
      console.error('Error parsing excel:', err);
      setErrorMsg(err.message || 'Gagal memproses file Excel.');
      setParsedRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) processFile(droppedFile);
  };

  const handleSave = async () => {
    if (parsedRows.length === 0) return;
    setIsSaving(true);
    const toastId = toast.loading('Menyimpan & menyinkronkan profil karyawan ke Database & Modul Orderan Makanan...');

    try {
      const res = await fetch('/api/meal-orders/import-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsedRows }),
      });

      const json = await res.json();
      if (!res.ok || json.status !== 'success') {
        throw new Error(json.message || 'Gagal memperbarui profil karyawan.');
      }

      toast.success(json.message || `Berhasil memperbarui ${parsedRows.length} profil karyawan!`, { id: toastId });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Import error:', err);
      toast.error(err.message || 'Terjadi kesalahan saat menyimpan data profil.', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const tbpCount = parsedRows.filter(r => r.pt === 'TBP').length;
  const gpsCount = parsedRows.filter(r => r.pt === 'GPS').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-emerald-700/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Import Perbarui Profil Karyawan
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                  Format Standar Excel
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Perbarui data NIK, Nama, Status Mess, PT, Shift, Section, dan Tempat Tinggal (Nirwana dsb)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSaving}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Konten Utama */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Petunjuk Format & Download Template */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Format Kolom Wajib Excel:</span>
              </p>
              <p className="text-[11px] font-mono font-medium text-emerald-800 dark:text-emerald-400">
                NO · NAMA KARYAWAN NR · NIK · Status Mess · PT · Shift · Section · Tempat Tinggal
              </p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              type="button"
              className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-bold shadow-xs hover:bg-emerald-100/50 cursor-pointer shrink-0 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Contoh Excel</span>
            </button>
          </div>

          {/* Area Drag & Drop File */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 scale-[0.99]'
                : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) processFile(f);
              }}
            />

            {isParsing ? (
              <div className="flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Membaca dan memvalidasi file Excel...</p>
              </div>
            ) : file ? (
              <div className="flex flex-col items-center justify-center space-y-2">
                <span className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{file.name}</p>
                <p className="text-xs text-emerald-600 font-semibold">
                  {parsedRows.length} baris karyawan siap diimpor · Klik untuk ganti file
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-2">
                <span className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center">
                  <UploadCloud className="w-6 h-6" />
                </span>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Tarik file Excel ke sini atau <span className="text-emerald-700 dark:text-emerald-400 underline">Klik untuk Pilih File</span>
                </p>
                <p className="text-xs text-slate-400">Mendukung format .xlsx, .xls, .csv</p>
              </div>
            )}
          </div>

          {/* Pesan Error Jika Ada */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Ringkasan & Preview Tabel */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              {/* Statistik Ringkas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Karyawan</span>
                  <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{parsedRows.length}</p>
                </div>
                <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">PT TBP</span>
                  <p className="text-xl font-black text-blue-800 dark:text-blue-300 mt-0.5">{tbpCount} Karyawan</p>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">PT GPS</span>
                  <p className="text-xl font-black text-emerald-800 dark:text-emerald-300 mt-0.5">{gpsCount} Karyawan</p>
                </div>
                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Status Modul</span>
                  <p className="text-xs font-black text-indigo-800 dark:text-indigo-300 mt-1">SIAP DISINKRONKAN</p>
                </div>
              </div>

              {/* Tabel Preview */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <div className="max-h-60 overflow-x-auto overflow-y-auto scrollbar-thin">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-[11px] font-bold uppercase text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-3 py-2.5 text-center w-10">No</th>
                        <th className="px-3 py-2.5">Nama Karyawan</th>
                        <th className="px-3 py-2.5 font-mono">NIK</th>
                        <th className="px-3 py-2.5 text-center">Status Mess</th>
                        <th className="px-3 py-2.5 text-center">PT</th>
                        <th className="px-3 py-2.5">Shift</th>
                        <th className="px-3 py-2.5">Section</th>
                        <th className="px-3 py-2.5">Tempat Tinggal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                      {parsedRows.map((r, i) => (
                        <tr key={r.nik + i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-3 py-2 text-center text-slate-400 font-mono">{r.no || i + 1}</td>
                          <td className="px-3 py-2 font-bold">{r.nama}</td>
                          <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-400">{r.nik}</td>
                          <td className="px-3 py-2 text-center">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {r.statusMess}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                              r.pt === 'GPS'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                            }`}>
                              {r.pt}
                            </span>
                          </td>
                          <td className="px-3 py-2">{r.shift}</td>
                          <td className="px-3 py-2 truncate max-w-[180px]" title={r.section}>{r.section}</td>
                          <td className="px-3 py-2">{r.tempatTinggal}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <p className="text-[11px] text-slate-500">
            * Kolom PT di Orderan Makanan hanya dapat diperbarui lewat proses import profil ini atau edit manual.
          </p>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="h-9 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={parsedRows.length === 0 || isSaving}
              className="h-9 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Perbarui Profil Karyawan ({parsedRows.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
