import React, { useState } from 'react';
import { 
  X, GitFork, ShieldCheck, ArrowRight, Clock, 
  CheckCircle2, AlertTriangle, Layers, Flame, Cpu, 
  FileCheck, FileSpreadsheet, Search, Filter, ShieldAlert,
  ChevronRight
} from 'lucide-react';
import { BalanceOverrideAuditLog } from '../daily-performance-v2/daily-performance-v2-types';
import { getStoredBalanceAuditLogs } from '../daily-performance-v2/daily-performance-v2-utils';

interface TracebackSchemeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TracebackSchemeModal: React.FC<TracebackSchemeModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'sample_flow' | 'balance_audit' | 'logs'>('sample_flow');
  const [auditLogs, setAuditLogs] = useState<BalanceOverrideAuditLog[]>(() => getStoredBalanceAuditLogs());
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = auditLogs.filter(log => {
    const q = searchTerm.toLowerCase();
    return (
      log.stationName.toLowerCase().includes(q) ||
      log.modifiedBy.toLowerCase().includes(q) ||
      log.reason.toLowerCase().includes(q) ||
      log.previousShiftInfo.foreman.toLowerCase().includes(q) ||
      log.date.includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-teal-500/10 via-teal-500/5 to-transparent border-b border-teal-200/50 dark:border-teal-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                Skema Traceback & Audit Trail Laboratorium
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Transparansi alur data sampel, cascading stasiun kerja, dan penelusuran koreksi saldo
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigasi Modal */}
        <div className="px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('sample_flow')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-2xl border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'sample_flow'
                ? 'border-teal-600 text-teal-700 dark:text-teal-300 bg-teal-50/50 dark:bg-teal-950/20'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>1. Alur Telusur Sampel (Sample Lineage)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('balance_audit')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-2xl border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'balance_audit'
                ? 'border-amber-600 text-amber-700 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/20'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>2. Skema Telusur Koreksi Saldo (Balance Traceback)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('logs');
              setAuditLogs(getStoredBalanceAuditLogs());
            }}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-2xl border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'logs'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/20'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>3. Rekap Audit Log ({auditLogs.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          {/* TAB 1: ALUR TELUSUR SAMPEL */}
          {activeTab === 'sample_flow' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60">
                <h4 className="font-bold text-teal-900 dark:text-teal-200 text-sm mb-1 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  Prinsip 1x Pendaftaran Hulu & Cascading Otomatis Hilir
                </h4>
                <p className="text-[11px] text-teal-800/90 dark:text-teal-300/90 leading-relaxed">
                  Dalam sistem Daily Report Laboratory, operator <strong>hanya menginput 1x di stasiun hulu</strong>.
                  Data selanjutnya mengalir otomatis ke stasiun hilir sehingga tidak terjadi duplikasi input dan meminimalkan human error.
                </p>
              </div>

              {/* Diagram Jalur XRF Basah */}
              <div className="space-y-3">
                <span className="font-bold text-slate-800 dark:text-white text-xs block">
                  Jalur A: XRF Basah (Weighing ➔ Fusion ➔ WDXRF ➔ QC ➔ Pelaporan CoA)
                </span>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {/* Step 1 */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 relative">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        Hulu 1
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Tahap 1</span>
                    </div>
                    <strong className="block text-slate-800 dark:text-slate-100 text-xs mb-1">
                      Stasiun Weighing
                    </strong>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      • <strong>Eksplorasi</strong>: Didaftarkan per batch (TBP, GPS, dll.)<br/>
                      • <strong>Non-Eksplorasi</strong>: Input jumlah langsung (Smelter, Prod, Khusus)
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 relative">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                        Proses 2
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Tahap 2</span>
                    </div>
                    <strong className="block text-slate-800 dark:text-slate-100 text-xs mb-1">
                      Bead Fusion
                    </strong>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Foreman tinggal checklist batch mana yang selesai dilebur. Sisa batch otomatis menjadi <strong>OS Fusion</strong>.
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 relative">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                        Scan 3
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Tahap 3</span>
                    </div>
                    <strong className="block text-indigo-900 dark:text-indigo-200 text-xs mb-1">
                      WDXRF Zetium
                    </strong>
                    <p className="text-[10px] text-indigo-800/80 dark:text-indigo-300/80 leading-tight">
                      Otomatis menerima bead dari <strong>Finish Fusion</strong>. Dilengkapi accordion per kategori untuk memilih batch finish scan.
                    </p>
                  </div>

                  {/* Step 4 */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 relative">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                        Validasi 4
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Tahap 4</span>
                    </div>
                    <strong className="block text-slate-800 dark:text-slate-100 text-xs mb-1">
                      QC Data Lab
                    </strong>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Received ditarik otomatis dari <strong>Total Selesai WDXRF</strong>. Validasi standar internal & duplikat.
                    </p>
                  </div>

                  {/* Step 5 */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 relative">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        Hilir 5
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Tahap 5</span>
                    </div>
                    <strong className="block text-emerald-900 dark:text-emerald-200 text-xs mb-1">
                      Pelaporan CoA
                    </strong>
                    <p className="text-[10px] text-emerald-800/80 dark:text-emerald-300/80 leading-tight">
                      Received ditarik dari <strong>Finish QC</strong>. Pelepasan sertifikat CoA resmi ke Mining / Smelter.
                    </p>
                  </div>
                </div>
              </div>

              {/* Diagram Jalur GC */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-800 dark:text-white text-xs block">
                  Jalur B: Grade Control (Prep Kering ➔ Press Pellet ➔ EDXRF)
                </span>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 mb-1.5 inline-block">
                      1. Penerimaan
                    </span>
                    <strong className="block text-slate-800 dark:text-slate-100 text-xs mb-1">
                      Serbuk Kering dari Prep
                    </strong>
                    <p className="text-[10px] text-slate-500">
                      Jumlah sampel serbuk hasil pulverizer yang diserahkan dari preparasi kering masuk ke laboratorium.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200 mb-1.5 inline-block">
                      2. Meja Press Pellet
                    </span>
                    <strong className="block text-amber-900 dark:text-amber-200 text-xs mb-1">
                      OS Press vs Finished Press
                    </strong>
                    <p className="text-[10px] text-amber-800/80 dark:text-amber-300/80">
                      Jika hasil press di bawah sampel diterima, selisihnya menjadi <strong>OS Press</strong> (serbuk belum dipress).
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 mb-1.5 inline-block">
                      3. Spektrometer EDXRF
                    </span>
                    <strong className="block text-slate-800 dark:text-slate-100 text-xs mb-1">
                      Hanya Pelet Finished yang Masuk
                    </strong>
                    <p className="text-[10px] text-slate-500">
                      Meja EDXRF (Epsilon & Puma) hanya menerima pelet yang sudah selesai dipress. Menghasilkan <strong>OS EDXRF</strong> tersendiri.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SKEMA TELUSUR KOREKSI SALDO */}
          {activeTab === 'balance_audit' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2">
                <h4 className="font-bold text-amber-900 dark:text-amber-200 text-sm flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Mekanisme Traceback Selisih Saldo Awal (Balance Discrepancy)
                </h4>
                <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                  Dalam operasional serah terima shift, sering kali terjadi perbedaan antara catatan saldo sisa di sistem
                  dengan jumlah fisik aktual di atas meja stasiun kerja. Berikut alur penelusuran jika terjadi ketidaksesuaian:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-white block">
                    Langkah 1: Kunci Saldo Otomatis
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Saldo awal shift aktif <strong>terkunci secara default</strong> dan ditarik langsung dari saldo sisa (OS)
                    yang disahkan oleh foreman shift sebelumnya. Input manual dinonaktifkan untuk mencegah manipulasi angka.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-white block">
                    Langkah 2: Investigasi via Tanda Seru
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Bila personil shift saat ini menemukan selisih fisik, personil menekan <strong>ikon tanda seru abu-abu</strong>.
                    Sistem langsung menampilkan laporan shift lalu: siapa foreman-nya, berapa intake-nya, dan berapa finish-nya.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-white block">
                    Langkah 3: Perekaman Jejak Audit
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Penggantian nilai saldo mewajibkan memasukkan <strong>Nama Personil Pengubah</strong> dan <strong>Alasan Investigasi</strong>.
                    Perubahan tersebut diabadikan di Audit Log dan dapat ditelusuri kembali sewaktu-waktu oleh Manajemen Lab.
                  </p>
                </div>
              </div>

              {/* Box Rangkuman Kemungkinan Kesalahan */}
              <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="font-bold text-slate-800 dark:text-white text-xs block">
                  Titik Rawan Kesalahan yang Ditelusuri (Root Cause Traceback):
                </span>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                  <li><strong>Kesalahan Penginputan Awal Hulu</strong>: Jumlah kantong serbuk yang diterima dari prep kering salah hitung saat serah terima.</li>
                  <li><strong>Kesalahan Penginputan Selesai (Finish)</strong>: Foreman shift lalu menginput hasil scan alat tanpa mengurangi batch yang reject/rusak.</li>
                  <li><strong>Sampel Tertinggal / Terselip</strong>: Sampel fisik tertinggal di nampan pengeringan atau di samping mesin tanpa tercatat.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: REKAP AUDIT LOG */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Cari stasiun, personil, atau alasan..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium"
                  />
                </div>
                <span className="text-xs text-slate-500 font-semibold">
                  Total Log: <strong>{filteredLogs.length}</strong> peristiwa
                </span>
              </div>

              {filteredLogs.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
                  <p className="text-xs text-slate-500 font-semibold">
                    Belum ada riwayat koreksi saldo awal yang tercatat.
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Seluruh saldo awal stasiun saat ini berjalan selaras 100% dengan saldo sisa yang diturunkan oleh shift sebelumnya.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredLogs.map(log => (
                    <div 
                      key={log.id}
                      className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold text-[10px]">
                            {log.stationName}
                          </span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            {log.originalValue} spl ➔ <span className="text-amber-600 font-mono font-bold">{log.correctedValue} spl</span>
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(log.timestamp).toLocaleString('id-ID')}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Personil Pengubah:</span>
                          <strong className="text-slate-800 dark:text-slate-200">{log.modifiedBy}</strong>
                          <span className="text-[10px] text-slate-500 block">
                            Shift {log.shift} ({log.regu}) • {log.date}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Foreman Shift Lalu Terkait:</span>
                          <strong className="text-slate-800 dark:text-slate-200">
                            {log.previousShiftInfo.foreman || 'Foreman Shift Lalu'}
                          </strong>
                          <span className="text-[10px] text-slate-500 block">
                            Shift {log.previousShiftInfo.shift} ({log.previousShiftInfo.regu}) • {log.previousShiftInfo.date}
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-600 dark:text-slate-400">
                        <span className="text-slate-400 font-semibold">Alasan Koreksi: </span>
                        <span>{log.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Tutup Skema Traceback
          </button>
        </div>
      </div>
    </div>
  );
};
