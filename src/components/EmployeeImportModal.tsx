import React, { useState, useRef } from 'react';
import { 
  X, UploadCloud, FileSpreadsheet, Download, CheckCircle2, 
  AlertTriangle, RefreshCw, FileText, ArrowRight, Check, Eye, Image as ImageIcon
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export const MASTER_EMPLOYEE_COLUMNS = [
  "No.",
  "Nama",
  "NIK",
  "No.KTP",
  "PT",
  "POH",
  "Sponsor",
  "Status Karyawan",
  "Tanggal Efektif Tidak Bekerja",
  "DOH Awal",
  "Tanggal Jabatan Baru",
  "Masa Kerja",
  "Masa Kerja Jabatan Terakhir",
  "Departemen",
  "Bagian",
  "Job Grade",
  "Gol",
  "Jabatan Baru",
  "Status Kontrak",
  "Tanggal Permanent",
  "Tempat Lahir",
  "Tanggal Lahir",
  "Nomor Telp. Pribadi",
  "Keluarga Kandung yang Bisa Dihubungi",
  "No.Telephone Keluarga Kandung",
  "Orang terdekat yang bisa dihubungi",
  "No.Telephone darurat Orang Terdekat",
  "Alamat Sesuai KTP",
  "Alamat Domisili",
  "Foto"
];

interface EmployeeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  inspectorNik: string;
}

export function EmployeeImportModal({ isOpen, onClose, onSuccess, inspectorNik }: EmployeeImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    status: 'success' | 'error';
    message: string;
    stats?: {
      total: number;
      updated: number;
      inserted: number;
      errors: number;
      errorList?: string[];
    };
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleDownloadTemplateCsv = () => {
    const sampleRow: Record<string, string> = {
      "No.": "1",
      "Nama": "Contoh Nama Karyawan",
      "NIK": "02D25000001",
      "No.KTP": "7172080508950004",
      "PT": "TBP",
      "POH": "Kawasi",
      "Sponsor": "Thisi Tuwaidan (HR Comben)",
      "Status Karyawan": "Active",
      "Tanggal Efektif Tidak Bekerja": "-",
      "DOH Awal": "26-Agu-2016",
      "Tanggal Jabatan Baru": "17-Des-2018",
      "Masa Kerja": "9 Tahun 11 Bulan",
      "Masa Kerja Jabatan Terakhir": "7 Tahun 8 Bulan",
      "Departemen": "Preparation & Laboratory",
      "Bagian": "Preparation",
      "Job Grade": "M2.8",
      "Gol": "II",
      "Jabatan Baru": "Preparation Foreman",
      "Status Kontrak": "Permanent",
      "Tanggal Permanent": "26-May-19",
      "Tempat Lahir": "Desa LoLeo",
      "Tanggal Lahir": "21-Aug-80",
      "Nomor Telp. Pribadi": "082196661254",
      "Keluarga Kandung yang Bisa Dihubungi": "Istri",
      "No.Telephone Keluarga Kandung": "081380569187",
      "Orang terdekat yang bisa dihubungi": "Adik",
      "No.Telephone darurat Orang Terdekat": "082269972377",
      "Alamat Sesuai KTP": "Desa loleo kec Obi selatan",
      "Alamat Domisili": "Desa loleo kec Obi selatan",
      "Foto": "https://drive.google.com/file/d/contoh_id/view"
    };

    const csvContent = Papa.unparse({
      fields: MASTER_EMPLOYEE_COLUMNS,
      data: [sampleRow]
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `template_database_karyawan_30kolom_preplab.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTemplateExcel = () => {
    const sampleRow = [
      MASTER_EMPLOYEE_COLUMNS,
      [
        "1",
        "Contoh Nama Karyawan",
        "02D25000001",
        "7172080508950004",
        "TBP",
        "Kawasi",
        "Thisi Tuwaidan (HR Comben)",
        "Active",
        "-",
        "26-Agu-2016",
        "17-Des-2018",
        "9 Tahun 11 Bulan",
        "7 Tahun 8 Bulan",
        "Preparation & Laboratory",
        "Preparation",
        "M2.8",
        "II",
        "Preparation Foreman",
        "Permanent",
        "26-May-19",
        "Desa LoLeo",
        "21-Aug-80",
        "082196661254",
        "Istri",
        "081380569187",
        "Adik",
        "082269972377",
        "Desa loleo kec Obi selatan",
        "Desa loleo kec Obi selatan",
        "https://drive.google.com/file/d/contoh_id/view"
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(sampleRow);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Database Karyawan");
    XLSX.writeFile(wb, "template_database_karyawan_30kolom_preplab.xlsx");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    setIsParsing(true);
    setErrorMsg(null);
    setImportResult(null);
    setParsedRows([]);
    setDetectedHeaders([]);

    const fileName = selectedFile.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setIsParsing(false);
          if (results.data && results.data.length > 0) {
            setParsedRows(results.data);
            if (results.meta && results.meta.fields) {
              setDetectedHeaders(results.meta.fields);
            }
          } else {
            setErrorMsg("File CSV kosong atau tidak memiliki format baris yang valid.");
          }
        },
        error: (err) => {
          setIsParsing(false);
          setErrorMsg("Gagal membaca CSV: " + err.message);
        }
      });
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

          setIsParsing(false);
          if (json && json.length > 0) {
            setParsedRows(json);
            setDetectedHeaders(Object.keys(json[0] || {}));
          } else {
            setErrorMsg("Sheet Excel kosong.");
          }
        } catch (err: any) {
          setIsParsing(false);
          setErrorMsg("Gagal membaca Excel: " + err.message);
        }
      };
      reader.onerror = () => {
        setIsParsing(false);
        setErrorMsg("Gagal membaca file.");
      };
      reader.readAsArrayBuffer(selectedFile);
    } else {
      setIsParsing(false);
      setErrorMsg("Format file tidak didukung. Harap gunakan .csv, .xlsx, atau .xls");
    }
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;
    setIsImporting(true);
    setErrorMsg(null);
    setImportResult(null);

    try {
      const res = await fetch('/api/employees/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-nik': inspectorNik
        },
        body: JSON.stringify({
          rows: parsedRows,
          editorNik: inspectorNik
        })
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setImportResult({
          status: 'success',
          message: data.message,
          stats: data.stats
        });
        onSuccess();
      } else {
        setImportResult({
          status: 'error',
          message: data.message || "Gagal mengimport data."
        });
      }
    } catch (err: any) {
      setImportResult({
        status: 'error',
        message: "Koneksi server gagal: " + err.message
      });
    } finally {
      setIsImporting(false);
    }
  };

  const hasNikHeader = detectedHeaders.some(h => {
    const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
    return clean === 'nik';
  });

  const hasNameHeader = detectedHeaders.some(h => {
    const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
    return clean === 'nama' || clean === 'name';
  });

  const hasFotoHeader = detectedHeaders.some(h => {
    const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
    return clean === 'foto' || clean === 'photo' || clean === 'avatar';
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-white rounded-3xl border border-slate-300 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-900"
      >
        {/* Header Modal */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md">
              <FileSpreadsheet className="w-6 h-6" />
            </span>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                <span>Import & Update Database Karyawan</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  30 Kolom Master
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Struktur kolom lengkap termasuk <strong>Tanggal Efektif Tidak Bekerja</strong> dan upload <strong>Foto ke Google Drive</strong>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* Download Template Strip */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-indigo-600" />
                Template Master Kolom Data Karyawan (30 Kolom Resmi)
              </h4>
              <p className="text-[11px] text-indigo-800/80 mt-0.5">
                Gunakan template ini untuk update data karyawan, tanggal efektif tidak bekerja, dan foto profil.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleDownloadTemplateCsv}
                className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-white border border-indigo-300 hover:bg-indigo-100/50 text-indigo-900 font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                Download CSV
              </button>
              <button
                type="button"
                onClick={handleDownloadTemplateExcel}
                className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Download Excel (.xlsx)
              </button>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer ${
              file 
                ? 'border-indigo-400 bg-indigo-50/30' 
                : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/20 bg-white'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv, .xlsx, .xls"
              className="hidden"
            />
            
            <div className="flex flex-col items-center justify-center">
              <span className={`p-3.5 rounded-2xl mb-3 shadow-xs ${
                file ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                <UploadCloud className="w-7 h-7" />
              </span>

              {file ? (
                <div>
                  <p className="font-bold text-sm text-slate-800">{file.name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Ukuran: {(file.size / 1024).toFixed(1)} KB • Klik atau seret file lain untuk mengganti
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-bold text-sm text-slate-800">
                    Klik atau Seret file CSV / Excel ke sini
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Mendukung format file <strong>.csv</strong>, <strong>.xlsx</strong>, atau <strong>.xls</strong> (30 Kolom)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Drive Photo Auto-upload Note */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5">
            <span className="p-1 rounded-lg bg-amber-200 text-amber-900 shrink-0 mt-0.5">
              <ImageIcon className="w-3.5 h-3.5" />
            </span>
            <div className="leading-relaxed">
              <strong>Otomatisasi Google Drive untuk Foto:</strong> Kolom <code>Foto</code> dapat diisi dengan Link Google Drive, URL gambar, atau Base64 Image. Sistem akan otomatis memproses dan menyimpannya di Google Drive Shared Storage PrepLab.
            </div>
          </div>

          {/* Parsing Spinner */}
          {isParsing && (
            <div className="p-4 rounded-2xl bg-white border border-slate-200 text-center flex items-center justify-center gap-3">
              <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
              <span className="text-xs font-semibold text-slate-700">Sedang membaca dan memvalidasi file...</span>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          {/* Import Result Feedback */}
          {importResult && (
            <div className={`p-4 rounded-2xl text-xs border ${
              importResult.status === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm mb-1">
                {importResult.status === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <span>{importResult.message}</span>
              </div>
              {importResult.stats && (
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/60 font-semibold">
                  <div className="p-2 rounded-xl bg-white/80 border border-emerald-200/60 text-center">
                    <p className="text-[10px] uppercase text-slate-500">Total Baris</p>
                    <p className="text-sm font-extrabold text-slate-800">{importResult.stats.total}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white/80 border border-emerald-200/60 text-center">
                    <p className="text-[10px] uppercase text-emerald-600">Diperbarui</p>
                    <p className="text-sm font-extrabold text-emerald-700">{importResult.stats.updated}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white/80 border border-emerald-200/60 text-center">
                    <p className="text-[10px] uppercase text-indigo-600">Ditambahkan</p>
                    <p className="text-sm font-extrabold text-indigo-700">{importResult.stats.inserted}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white/80 border border-emerald-200/60 text-center">
                    <p className="text-[10px] uppercase text-rose-600">Gagal / Skip</p>
                    <p className="text-sm font-extrabold text-rose-700">{importResult.stats.errors}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Parsed Preview Section */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-indigo-600" />
                  <span>Preview Data ({parsedRows.length} Baris Terdeteksi)</span>
                </h4>
                <div className="flex items-center gap-2 text-[11px] flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                    hasNikHeader ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}>
                    {hasNikHeader ? <Check className="w-3 h-3" /> : '✕'} NIK
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                    hasNameHeader ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}>
                    {hasNameHeader ? <Check className="w-3 h-3" /> : '✕'} Nama
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                    hasFotoHeader ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    <ImageIcon className="w-3 h-3" /> Kolom Foto
                  </span>
                </div>
              </div>

              {/* Table Preview */}
              <div className="rounded-2xl border border-slate-300 overflow-hidden bg-white shadow-xs max-h-60 overflow-x-auto overflow-y-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 text-[11px]">
                    <tr>
                      <th className="p-2.5 whitespace-nowrap">No</th>
                      <th className="p-2.5 whitespace-nowrap">NIK</th>
                      <th className="p-2.5 whitespace-nowrap">Nama</th>
                      <th className="p-2.5 whitespace-nowrap">Jabatan</th>
                      <th className="p-2.5 whitespace-nowrap">Status</th>
                      <th className="p-2.5 whitespace-nowrap">Tgl Efektif Tidak Bekerja</th>
                      <th className="p-2.5 whitespace-nowrap">Sponsor</th>
                      <th className="p-2.5 whitespace-nowrap">Foto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                    {parsedRows.slice(0, 5).map((row, idx) => {
                      const nik = row['NIK'] || row['nik'] || row['Nik'] || '-';
                      const name = row['Nama'] || row['nama'] || row['Name'] || '-';
                      const jabatan = row['Jabatan Baru'] || row['Jabatan'] || row['jabatan'] || '-';
                      const status = row['Status Karyawan'] || row['Status'] || row['status'] || '-';
                      const tglOff = row['Tanggal Efektif Tidak Bekerja'] || row['tanggalEfektifTidakBekerja'] || '-';
                      const sponsor = row['Sponsor'] || row['sponsor'] || '-';
                      const foto = row['Foto'] || row['foto'] || row['Photo'] || row['avatar'] || '';

                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-2.5 font-bold font-mono text-indigo-700">{nik}</td>
                          <td className="p-2.5 font-bold text-slate-900">{name}</td>
                          <td className="p-2.5 text-slate-600">{jabatan}</td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {status}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-600">{tglOff || '-'}</td>
                          <td className="p-2.5 text-slate-600">{sponsor}</td>
                          <td className="p-2.5">
                            {foto ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1 w-fit">
                                <Check className="w-2.5 h-2.5" /> Terisi
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 5 && (
                <p className="text-[11px] text-slate-500 text-right">
                  + Menampilkan 5 baris pertama dari total {parsedRows.length} baris.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Tutup
          </button>

          <button
            type="button"
            disabled={parsedRows.length === 0 || isImporting || isParsing || !hasNikHeader}
            onClick={handleExecuteImport}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {isImporting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Mengimport {parsedRows.length} Karyawan...</span>
              </>
            ) : (
              <>
                <span>Mulai Import & Update Database</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
