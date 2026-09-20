import React, { useState, useRef } from 'react';
import { 
  X, UploadCloud, FileSpreadsheet, CheckCircle2, AlertTriangle, 
  Loader2, RefreshCw, Calendar, Users, Layers, Download, Check, Shield
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { parseRosterExcel, ParsedRosterResult, getExcelSheetNames } from '../lib/excelRosterParser';
import { toast } from 'sonner';

interface RosterExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUserNik?: string;
}

export const RosterExcelImportModal: React.FC<RosterExcelImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentUserNik
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedRosterResult | null>(null);

  // Selected Sheets
  const [detectedSheets, setDetectedSheets] = useState<string[]>([]);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);

  // Import Options
  const [updateEmployees, setUpdateEmployees] = useState(true);
  const [updateRosters, setUpdateRosters] = useState(true);
  const [updateCuti, setUpdateCuti] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (selectedFile: File) => {
    if (!selectedFile) return;

    const validExtensions = ['.xlsx', '.xls'];
    const fileName = selectedFile.name.toLowerCase();
    const isValid = validExtensions.some(ext => fileName.endsWith(ext));

    if (!isValid) {
      toast.error('Format file tidak didukung. Harap unggah file Excel (.xlsx atau .xls)');
      return;
    }

    setFile(selectedFile);
    setIsParsing(true);

    try {
      const buffer = await selectedFile.arrayBuffer();
      setFileBuffer(buffer);

      const allSheets = getExcelSheetNames(buffer);
      setDetectedSheets(allSheets);

      // Default select all sheets that likely contain roster data
      const defaultSelected = allSheets.filter(s => {
        const l = s.toLowerCase();
        return l.includes('staff') || l.includes('crew') || l.includes('cuti') || l.includes('roster');
      });
      const initialSelected = defaultSelected.length > 0 ? defaultSelected : allSheets;
      setSelectedSheets(initialSelected);

      // Parse with initial selected sheets
      const parsed = parseRosterExcel(buffer, { targetSheets: initialSelected });
      setParsedResult(parsed);

      toast.success(`File ${selectedFile.name} berhasil dibaca (${parsed.stats.totalEmployees} karyawan terdeteksi)`);
    } catch (err: any) {
      console.error('Error parsing Excel:', err);
      toast.error('Gagal membaca isi file Excel: ' + (err.message || 'Format tidak sesuai'));
      setParsedResult(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleToggleSheet = (sheetName: string) => {
    if (!fileBuffer) return;

    let updated: string[];
    if (selectedSheets.includes(sheetName)) {
      updated = selectedSheets.filter(s => s !== sheetName);
    } else {
      updated = [...selectedSheets, sheetName];
    }

    setSelectedSheets(updated);

    if (updated.length === 0) {
      setParsedResult(null);
      return;
    }

    setIsParsing(true);
    try {
      const parsed = parseRosterExcel(fileBuffer, { targetSheets: updated });
      setParsedResult(parsed);
    } catch (err) {
      console.error('Re-parse error:', err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDownloadTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sample Staff Sheet
      const staffHeaders = [
        'No', 'Nama', 'NIK', 'Jabatan', 'Job Grade', 'Section', 'Gol', 'Shift', 'POH', 'PT', 
        'Status Mess', 'Rotation', 'Tgl Awal Bergabung', 'Tgl Bergabung Terbaru', 'Status Kontrak',
        '1 Jan 26', '2 Jan 26', '3 Jan 26', '4 Jan 26', '5 Jan 26'
      ];
      const staffSampleRow = [
        '1', 'Contoh Nama Staff', '02D25000001', 'Chemist', 'Staff', 'Laboratory', 'II.1', 'Shift', 'Lokal', 'TBP',
        'Mess', '6:2', '01/01/2024', '01/01/2024', 'PKWTT',
        'D', 'D', 'OFF', 'N', 'N'
      ];
      const staffWs = XLSX.utils.aoa_to_sheet([staffHeaders, staffSampleRow]);
      XLSX.utils.book_append_sheet(wb, staffWs, 'Rooster_Staff');

      // Sample Crew Sheet
      const crewHeaders = [
        'No', 'Nama', 'NIK', 'Jabatan', 'Section', 'Gol', 'Shift', 'POH', 'PT', 
        'Status Mess', 'Rotation', 'Tgl Awal Bergabung', 'Tgl Bergabung Terbaru', 'Status Kontrak',
        '1 Jan 26', '2 Jan 26', '3 Jan 26', '4 Jan 26', '5 Jan 26'
      ];
      const crewSampleRow = [
        '1', 'Contoh Nama Crew', 'M0402240001', 'Operator Crusher', 'Preparation', 'I.1', 'Shift', 'Non-Lokal', 'TBP',
        'Mess', '10:2', '01/02/2024', '01/02/2024', 'PKWT',
        'D', 'D', 'D', 'OFF', 'OFF'
      ];
      const crewWs = XLSX.utils.aoa_to_sheet([crewHeaders, crewSampleRow]);
      XLSX.utils.book_append_sheet(wb, crewWs, 'Rooster_Crew');

      XLSX.writeFile(wb, 'Template_Roster_PrepLab.xlsx');
      toast.success('Template Excel berhasil diunduh');
    } catch (e: any) {
      toast.error('Gagal membuat template Excel: ' + e.message);
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedResult) return;

    if (!updateEmployees && !updateRosters && !updateCuti) {
      toast.error('Pilih setidaknya satu opsi data yang ingin diperbarui');
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading('Menyimpan data roster ke database...');

    try {
      const nik = currentUserNik || localStorage.getItem('preplab_nik') || '02D25000055';
      const res = await fetch('/api/roster/import-excel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-nik': nik
        },
        body: JSON.stringify({
          editorNik: nik,
          fileName: file?.name || 'roster.xlsx',
          employees: updateEmployees ? parsedResult.employees : [],
          rosters: updateRosters ? parsedResult.rosters : [],
          cuti: updateCuti ? parsedResult.cuti : [],
          updateEmployees,
          updateRosters,
          updateCuti
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal menyimpan ke database');
      }

      toast.success(data.message || 'Data roster berhasil diimpor!', { id: toastId });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Import error:', err);
      toast.error(err.message || 'Terjadi kesalahan saat mengimpor roster', { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-3xl border border-[var(--border-main)] bg-[var(--card-bg)] text-[var(--text-main)] shadow-2xl overflow-hidden my-8">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-main)] bg-[var(--input-bg)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display">Import Data Roster dari Excel PC</h3>
              <p className="text-xs text-[var(--text-muted)]">Unggah file spreadsheet roster (.xlsx / .xls) untuk memperbarui jadwal dan data karyawan portal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Dropzone Area */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-200 ${
              file 
                ? 'border-teal-500/60 bg-teal-500/5 dark:bg-teal-500/10' 
                : 'border-[var(--border-main)] hover:border-teal-500/50 hover:bg-slate-500/5'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={e => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />
            <div className="flex flex-col items-center justify-center gap-3">
              <div className={`p-4 rounded-3xl ${file ? 'bg-teal-500/20 text-teal-600' : 'bg-[var(--input-bg)] text-[var(--text-muted)]'}`}>
                {isParsing ? (
                  <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
                ) : file ? (
                  <CheckCircle2 className="w-8 h-8 text-teal-500" />
                ) : (
                  <UploadCloud className="w-8 h-8" />
                )}
              </div>

              <div>
                <span className="text-sm font-bold block">
                  {file ? file.name : 'Tarik & Letakkan File Excel Roster ke Sini'}
                </span>
                <span className="text-xs text-[var(--text-muted)] block mt-0.5">
                  {file ? `${(file.size / 1024).toFixed(1)} KB • Klik untuk ganti file` : 'Mendukung format Microsoft Excel (.xlsx, .xls)'}
                </span>
              </div>
            </div>
          </div>

          {/* Sheet Selector (jika ada file terunggah) */}
          {detectedSheets.length > 0 && (
            <div className="space-y-2 p-4 rounded-2xl bg-[var(--input-bg)] border border-[var(--border-main)]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-teal-500" />
                  Pilih Lembar Kerja (Sheet) yang Diproses:
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  {selectedSheets.length} dari {detectedSheets.length} sheet dipilih
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {detectedSheets.map(s => {
                  const isChecked = selectedSheets.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleToggleSheet(s)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                        isChecked 
                          ? 'bg-teal-500 text-white border-teal-600 shadow-xs' 
                          : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--border-main)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5" />}
                      <span>{s}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Hasil Live Preview & Metrik */}
          {parsedResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-[var(--input-bg)] border border-[var(--border-main)] text-center">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Karyawan</span>
                  <span className="text-xl font-black font-display text-teal-600 dark:text-teal-400">
                    {parsedResult.stats.totalEmployees}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] block">
                    ({parsedResult.stats.staffCount} Staff, {parsedResult.stats.crewCount} Crew)
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--input-bg)] border border-[var(--border-main)] text-center">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Rentang Tanggal</span>
                  <span className="text-sm font-black font-display text-amber-500 block truncate" title={`${parsedResult.dateRange.minDate} - ${parsedResult.dateRange.maxDate}`}>
                    {parsedResult.dateRange.minDate}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] block">
                    s/d {parsedResult.dateRange.maxDate} ({parsedResult.dateRange.datesCount} hari)
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--input-bg)] border border-[var(--border-main)] text-center">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Total Shift Roster</span>
                  <span className="text-xl font-black font-display text-blue-600 dark:text-blue-400">
                    {parsedResult.stats.totalRosterEntries.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] block">Entri Jadwal</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--input-bg)] border border-[var(--border-main)] text-center">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Cuti Tahunan</span>
                  <span className="text-xl font-black font-display text-purple-600 dark:text-purple-400">
                    {parsedResult.stats.cutiEntriesCount}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] block">Data Saldo Cuti</span>
                </div>
              </div>

              {/* Checkbox Opsi Sinkronisasi */}
              <div className="p-4 rounded-2xl bg-[var(--input-bg)] border border-[var(--border-main)] space-y-2.5">
                <span className="text-xs font-bold block mb-1">Pilih Data yang Ingin Diperbarui ke Database:</span>
                
                <label className="flex items-center gap-2.5 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={updateEmployees}
                    onChange={e => setUpdateEmployees(e.target.checked)}
                    className="rounded border-[var(--border-main)] text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                  />
                  <span>
                    <strong>Update Profil Karyawan</strong> (Jabatan, Section, Golongan, Shift, PT, POH, Mess, dsb.)
                  </span>
                </label>

                <label className="flex items-center gap-2.5 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={updateRosters}
                    onChange={e => setUpdateRosters(e.target.checked)}
                    className="rounded border-[var(--border-main)] text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                  />
                  <span>
                    <strong>Update Jadwal Shift Roster</strong> ({parsedResult.stats.totalRosterEntries.toLocaleString()} entri pada rentang tanggal file Excel)
                  </span>
                </label>

                {parsedResult.stats.cutiEntriesCount > 0 && (
                  <label className="flex items-center gap-2.5 text-xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={updateCuti}
                      onChange={e => setUpdateCuti(e.target.checked)}
                      className="rounded border-[var(--border-main)] text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                    />
                    <span>
                      <strong>Update Kuota Cuti Tahunan</strong> ({parsedResult.stats.cutiEntriesCount} personil)
                    </span>
                  </label>
                )}
              </div>

              {/* Sample Table Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[var(--text-muted)]">Cuplikan 5 Karyawan Pertama:</span>
                  <span className="text-[11px] text-[var(--text-muted)] font-mono">Format Portal: 100% Valid</span>
                </div>
                <div className="border border-[var(--border-main)] rounded-2xl overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[var(--input-bg)] border-b border-[var(--border-main)] font-bold text-[var(--text-muted)]">
                      <tr>
                        <th className="py-2.5 px-3">NIK</th>
                        <th className="py-2.5 px-3">Nama Karyawan</th>
                        <th className="py-2.5 px-3">Section</th>
                        <th className="py-2.5 px-3">Jabatan</th>
                        <th className="py-2.5 px-3 text-center">Jadwal Shift Terbaca</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-main)]">
                      {parsedResult.employees.slice(0, 5).map(emp => {
                        const shiftCount = parsedResult.rosters.filter(r => r.nik === emp.nik).length;
                        return (
                          <tr key={emp.nik} className="hover:bg-slate-500/5">
                            <td className="py-2 px-3 font-mono font-bold text-teal-600 dark:text-teal-400">{emp.nik}</td>
                            <td className="py-2 px-3 font-semibold">{emp.name}</td>
                            <td className="py-2 px-3 text-[var(--text-muted)]">{emp.section}</td>
                            <td className="py-2 px-3 text-[var(--text-muted)]">{emp.jabatan || '-'}</td>
                            <td className="py-2 px-3 text-center font-mono font-bold">
                              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                {shiftCount} hari
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-[var(--border-main)] bg-[var(--input-bg)]">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="w-full sm:w-auto px-4 py-2 rounded-2xl border border-[var(--border-main)] bg-[var(--card-bg)] hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-teal-600" />
            <span>Unduh Template Excel</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 rounded-2xl border border-[var(--border-main)] hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={!parsedResult || isUploading}
              className={`px-5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                !parsedResult || isUploading
                  ? 'bg-slate-300 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-transparent'
                  : 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-teal-500/20 active:scale-95'
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan ke Database...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Terapkan ke Portal</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
