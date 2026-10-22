import React, { useState, useMemo, useRef } from 'react';
import {
  X, UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle,
  ShieldCheck, ClipboardCheck, ArrowRight, RefreshCw, FileText,
  AlertTriangle, Info
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export type ImportSafetyMode = 'kta' | 'inspeksi';

interface SafetyRekapExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: ImportSafetyMode;
  currentWeek: string;
  currentYear: number;
  allRows: any[];
  onSuccess: () => Promise<void>;
  inspectorNik?: string;
  inspectorName?: string;
}

interface ParsedMatchItem {
  nik: string;
  name: string;
  isMatched: boolean;
  // Fields for KTA/TTA
  tglKta?: string | null;
  tglTta1?: string | null;
  tglTta2?: string | null;
  ktaDone?: boolean;
  // Fields for Inspeksi
  tglInspeksi?: string | null;
  keteranganInspeksi?: string | null;
  inspeksiDone?: boolean;
  // Debug / raw source
  rawCount: number;
  rawDetails?: string[];
}

// Helper untuk konversi format tanggal apapun (Excel serial, MM/DD/YYYY, DD/MM/YYYY, ISO) ke YYYY-MM-DD
function parseExcelDateToIso(raw: any): string | null {
  if (raw === undefined || raw === null || raw === '') return null;

  // 1. Jika serial number Excel (contoh: 45584 atau 45584.88)
  if (typeof raw === 'number') {
    try {
      const dateObj = XLSX.SSF.parse_date_code(raw);
      if (dateObj && dateObj.y && dateObj.m && dateObj.d) {
        const y = String(dateObj.y).padStart(4, '0');
        const m = String(dateObj.m).padStart(2, '0');
        const d = String(dateObj.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch {}
  }

  const s = String(raw).trim();
  if (!s) return null;

  // 2. Format ISO langsung YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 3. Format MM/DD/YYYY HH:mm:ss (contoh di screenshot: 10/19/2026 21:15:01)
  const mdyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (mdyMatch) {
    const first = parseInt(mdyMatch[1], 10);
    const second = parseInt(mdyMatch[2], 10);
    const year = mdyMatch[3];

    // Jika first > 12, maka pasti format DD/MM/YYYY
    if (first > 12) {
      const d = String(first).padStart(2, '0');
      const m = String(second).padStart(2, '0');
      return `${year}-${m}-${d}`;
    }

    // Default ke format M/D/YYYY (standar Timestamp Google Form / Excel di foto)
    const m = String(first).padStart(2, '0');
    const d = String(second).padStart(2, '0');
    return `${year}-${m}-${d}`;
  }

  // 4. Fallback dengan Date constructor
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  } catch {}

  return null;
}

export function SafetyRekapExcelImportModal({
  isOpen,
  onClose,
  defaultMode = 'kta',
  currentWeek,
  currentYear,
  allRows,
  onSuccess,
  inspectorNik,
  inspectorName
}: SafetyRekapExcelImportModalProps) {
  const [mode, setMode] = useState<ImportSafetyMode>(defaultMode);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [parsedItems, setParsedItems] = useState<ParsedMatchItem[]>([]);
  const [rawRowCount, setRawRowCount] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync defaultMode saat modal dibuka
  React.useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      setParsedItems([]);
      setFileName('');
      setRawRowCount(0);
    }
  }, [isOpen, defaultMode]);

  // Map NIK karyawan tabel rekap
  const empByNik = useMemo(() => {
    const map = new Map<string, any>();
    allRows.forEach(r => {
      const nik = String(r.nik || '').trim().toUpperCase();
      if (nik) map.set(nik, r);
    });
    return map;
  }, [allRows]);

  // Handler Parse File Excel
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        const wb = XLSX.read(buffer, { type: 'binary', cellDates: true });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        if (!ws) throw new Error('Lembar kerja Excel kosong');

        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (!rows || rows.length < 2) throw new Error('File Excel tidak memiliki baris data');

        setRawRowCount(rows.length - 1);

        // Header mapping
        const headerRow: string[] = (rows[0] || []).map((h: any) => String(h || '').trim().toLowerCase());
        const findColIdx = (...keywords: string[]): number => {
          return headerRow.findIndex(h => keywords.some(k => h.includes(k.toLowerCase())));
        };

        const nikIdx = findColIdx('nik');
        if (nikIdx === -1) {
          throw new Error('Kolom "NIK" tidak ditemukan pada baris judul file Excel.');
        }

        // Cari kolom tanggal / timestamp
        const timestampIdx = findColIdx('timestamp', 'tanggal inspeksi', 'tgl inspeksi', 'waktu', 'tanggal', 'date');
        // Cari kolom klasifikasi (untuk KTA/TTA)
        const klasifikasiIdx = findColIdx('klasifikasi', 'bahaya', 'kategori', 'jenis', 'hazard', 'tipe');
        // Cari kolom area / keterangan (untuk Inspeksi)
        const areaIdx = findColIdx('area', 'keterangan', 'lokasi', 'tempat');
        // Cari kolom nama opsional
        const nameIdx = findColIdx('nama');

        // Struktur data per NIK
        const perNikData = new Map<string, {
          nameFromExcel: string;
          datesKta: string[];
          datesTta: string[];
          datesInspeksi: string[];
          areasInspeksi: string[];
        }>();

        // Iterasi baris data (mulai index 1)
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const rawNik = String(row[nikIdx] || '').trim().toUpperCase();
          if (!rawNik) continue;

          const rawDate = timestampIdx !== -1 ? row[timestampIdx] : null;
          const parsedDate = parseExcelDateToIso(rawDate);

          const rawKlasifikasi = klasifikasiIdx !== -1 ? String(row[klasifikasiIdx] || '').trim().toUpperCase() : '';
          const rawArea = areaIdx !== -1 ? String(row[areaIdx] || '').trim() : '';
          const rawName = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : '';

          if (!perNikData.has(rawNik)) {
            perNikData.set(rawNik, {
              nameFromExcel: rawName,
              datesKta: [],
              datesTta: [],
              datesInspeksi: [],
              areasInspeksi: []
            });
          }

          const entry = perNikData.get(rawNik)!;
          if (rawName && !entry.nameFromExcel) entry.nameFromExcel = rawName;

          if (parsedDate) {
            if (mode === 'kta') {
              // Jika terdeteksi TTA
              if (rawKlasifikasi.includes('TTA')) {
                entry.datesTta.push(parsedDate);
              } else {
                // Default dianggap KTA
                entry.datesKta.push(parsedDate);
              }
            } else {
              // Mode Inspeksi
              entry.datesInspeksi.push(parsedDate);
              if (rawArea) entry.areasInspeksi.push(rawArea);
            }
          }
        }

        // Hasil akhir matching
        const items: ParsedMatchItem[] = [];

        perNikData.forEach((val, nik) => {
          const matchedEmp = empByNik.get(nik);
          const isMatched = Boolean(matchedEmp);
          const displayName = matchedEmp ? matchedEmp.name : (val.nameFromExcel || `Karyawan (${nik})`);

          if (mode === 'kta') {
            const tglKta = val.datesKta[0] || null;
            const tglTta1 = val.datesTta[0] || null;
            const tglTta2 = val.datesTta[1] || null;

            const details: string[] = [];
            if (tglKta) details.push(`KTA: ${tglKta}`);
            if (tglTta1) details.push(`TTA 1: ${tglTta1}`);
            if (tglTta2) details.push(`TTA 2: ${tglTta2}`);

            items.push({
              nik,
              name: displayName,
              isMatched,
              tglKta,
              tglTta1,
              tglTta2,
              ktaDone: Boolean(tglKta || tglTta1 || tglTta2),
              rawCount: val.datesKta.length + val.datesTta.length,
              rawDetails: details
            });
          } else {
            // Mode Inspeksi
            const tglInspeksi = val.datesInspeksi[0] || null;
            const keteranganInspeksi = val.areasInspeksi[0] || (matchedEmp?.keteranganInspeksi || 'Inspeksi Selesai');

            items.push({
              nik,
              name: displayName,
              isMatched,
              tglInspeksi,
              keteranganInspeksi,
              inspeksiDone: Boolean(tglInspeksi),
              rawCount: val.datesInspeksi.length,
              rawDetails: tglInspeksi ? [`Tgl: ${tglInspeksi}`, `Area: ${keteranganInspeksi}`] : []
            });
          }
        });

        // Urutkan: yang cocok di atas
        items.sort((a, b) => (b.isMatched ? 1 : 0) - (a.isMatched ? 1 : 0));

        setParsedItems(items);
        toast.success(`Berhasil memproses file Excel: ${items.length} personil teridentifikasi`);
      } catch (err: any) {
        console.error('Error parsing excel:', err);
        toast.error(err.message || 'Gagal membaca format file Excel');
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  // Simpan data hasil import ke backend
  const handleApplyToRekap = async () => {
    const matchedOnly = parsedItems.filter(item => item.isMatched);
    if (matchedOnly.length === 0) {
      toast.error('Tidak ada data karyawan yang cocok dengan Tabel Rekap');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading(`Menerapkan ${matchedOnly.length} data ke Tabel Rekap...`);

    try {
      const payloadItems = matchedOnly.map(item => {
        if (mode === 'kta') {
          return {
            nik: item.nik,
            name: item.name,
            ktaDone: item.ktaDone,
            tglKta: item.tglKta || null,
            tglTta1: item.tglTta1 || null,
            tglTta2: item.tglTta2 || null,
          };
        } else {
          return {
            nik: item.nik,
            name: item.name,
            inspeksiDone: item.inspeksiDone,
            tglInspeksi: item.tglInspeksi || null,
            keteranganInspeksi: item.keteranganInspeksi || null,
          };
        }
      });

      const res = await fetch('/api/safety-rekap/edits/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week: currentWeek,
          year: currentYear,
          items: payloadItems,
          editorNik: inspectorNik,
          editorName: inspectorName
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Gagal menyimpan data import');
      }

      toast.success(`Berhasil menerapkan ${matchedOnly.length} data ke Tabel Rekap (${currentWeek})`, { id: toastId });
      await onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Submit bulk edits failed:', err);
      toast.error(err.message || 'Gagal menerapkan data ke database', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const matchedCount = parsedItems.filter(i => i.isMatched).length;
  const unmatchedCount = parsedItems.length - matchedCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs ${
              mode === 'kta' ? 'bg-[#F5A623] text-white' : 'bg-[#24A1B2] text-white'
            }`}>
              {mode === 'kta' ? <ShieldCheck className="w-5 h-5" /> : <ClipboardCheck className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 leading-tight">
                Import Data Excel ke Tabel Rekap
              </h2>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Target: Minggu <span className="text-[#24A1B2] font-black">{currentWeek}</span> · Tahun {currentYear}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Pemilih Mode Import */}
        <div className="flex items-center gap-2 px-6 pt-4 pb-2 border-b border-slate-100">
          <button
            type="button"
            onClick={() => {
              setMode('kta');
              setParsedItems([]);
              setFileName('');
            }}
            className={`flex-1 sm:flex-none h-10 px-5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              mode === 'kta'
                ? 'bg-[#F5A623] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>1. Import KTA / TTA</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('inspeksi');
              setParsedItems([]);
              setFileName('');
            }}
            className={`flex-1 sm:flex-none h-10 px-5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              mode === 'inspeksi'
                ? 'bg-[#24A1B2] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>2. Import Inspeksi</span>
          </button>
        </div>

        {/* Body Modal */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Instruksi Alur Kerja */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Info className="w-4 h-4 text-[#24A1B2]" />
              <span>
                {mode === 'kta'
                  ? 'Format Excel KTA / TTA yang Didukung:'
                  : 'Format Excel Inspeksi yang Didukung (Sesuai Foto):'}
              </span>
            </div>
            {mode === 'kta' ? (
              <p className="leading-relaxed">
                File Excel harus memiliki kolom <b>Timestamp</b>, <b>NIK</b>, dan <b>Klasifikasi Bahaya</b>.
                Data temuan KTA akan otomatis masuk ke <b>TGL KTA</b>, sedangkan temuan TTA ke-1 ke <b>TGL TTA 1</b> dan temuan TTA ke-2 ke <b>TGL TTA 2</b>.
              </p>
            ) : (
              <p className="leading-relaxed">
                File Excel harus memiliki kolom <b>Timestamp</b> / <b>Tanggal Inspeksi</b>, <b>NIK</b>, dan <b>Area</b>.
                Tanggal otomatis masuk ke <b>TGL Inspeksi</b> dan nama area ke <b>Keterangan Inspeksi</b>.
              </p>
            )}
          </div>

          {/* Area Upload File */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-[#24A1B2] bg-slate-50 hover:bg-teal-50/30 rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 text-[#24A1B2] shadow-sm flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
              {isProcessing ? (
                <RefreshCw className="w-6 h-6 animate-spin text-[#24A1B2]" />
              ) : (
                <UploadCloud className="w-7 h-7 text-[#24A1B2]" />
              )}
            </div>
            <p className="text-sm font-bold text-slate-900">
              {fileName ? fileName : 'Klik atau seret file Excel ke sini'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Mendukung format spreadsheet <b>.xlsx</b>, <b>.xls</b>, atau <b>.csv</b>
            </p>
          </div>

          {/* Tabel Hasil Parsing & Preview */}
          {parsedItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[#24A1B2]" />
                  <span>Preview Hasil Pembacaan Data ({parsedItems.length} Personil Terdeteksi)</span>
                </h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ✓ {matchedCount} Cocok di Tabel Rekap
                  </span>
                  {unmatchedCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      ⚠ {unmatchedCount} NIK Tidak Terdaftar
                    </span>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-[11px] uppercase font-bold text-slate-700 sticky top-0 z-10 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2.5 text-center w-10">No</th>
                      <th className="px-3 py-2.5">Nama &amp; NIK</th>
                      {mode === 'kta' ? (
                        <>
                          <th className="px-3 py-2.5 text-center text-[#D68910]">TGL KTA</th>
                          <th className="px-3 py-2.5 text-center text-[#D68910]">TGL TTA 1</th>
                          <th className="px-3 py-2.5 text-center text-[#D68910]">TGL TTA 2</th>
                        </>
                      ) : (
                        <>
                          <th className="px-3 py-2.5 text-center text-[#24A1B2]">TGL Inspeksi</th>
                          <th className="px-3 py-2.5 text-[#24A1B2]">Area / Keterangan</th>
                        </>
                      )}
                      <th className="px-3 py-2.5 text-center">Status Matching</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                    {parsedItems.map((item, idx) => (
                      <tr key={item.nik + idx} className={`hover:bg-slate-50/80 transition-colors ${
                        !item.isMatched ? 'bg-amber-50/30' : ''
                      }`}>
                        <td className="px-3 py-2 text-center text-slate-400">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="text-[10.5px] font-mono text-slate-500">{item.nik}</div>
                        </td>
                        {mode === 'kta' ? (
                          <>
                            <td className="px-3 py-2 text-center font-mono font-bold text-[#D68910]">
                              {item.tglKta || '—'}
                            </td>
                            <td className="px-3 py-2 text-center font-mono font-bold text-[#D68910]">
                              {item.tglTta1 || '—'}
                            </td>
                            <td className="px-3 py-2 text-center font-mono font-bold text-[#D68910]">
                              {item.tglTta2 || '—'}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-2 text-center font-mono font-bold text-[#24A1B2]">
                              {item.tglInspeksi || '—'}
                            </td>
                            <td className="px-3 py-2 text-[11px] text-slate-600 truncate max-w-[200px]" title={item.keteranganInspeksi || ''}>
                              {item.keteranganInspeksi || '—'}
                            </td>
                          </>
                        )}
                        <td className="px-3 py-2 text-center">
                          {item.isMatched ? (
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Cocok
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200" title="NIK ini tidak ditemukan di daftar personil rekap minggu ini">
                              <AlertCircle className="w-3 h-3 text-amber-600" /> Dilewati
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-10 px-5 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-50"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleApplyToRekap}
            disabled={isSubmitting || matchedCount === 0}
            className={`h-10 px-6 rounded-2xl text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50 ${
              mode === 'kta' ? 'bg-[#F5A623] hover:bg-[#D68910]' : 'bg-[#24A1B2] hover:bg-[#1A7A88]'
            }`}
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-white" />
            )}
            <span>Terapkan {matchedCount > 0 ? `${matchedCount} Data` : ''} ke Tabel Rekap</span>
          </button>
        </div>

      </div>
    </div>
  );
}
