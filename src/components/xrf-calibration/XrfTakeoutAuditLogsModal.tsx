import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, ShieldCheck, ShieldAlert, Download, Search, 
  Filter, X, RefreshCw, User, Calendar, Activity, 
  RotateCcw, Trash2, CheckCircle2, ChevronDown, Check 
} from 'lucide-react';
import { XrfOffspecAuditLog, fetchTakeoutAuditLogs } from '../../utils/xrfTakeoutAuth';
import { toast } from 'sonner';

interface XrfTakeoutAuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialInstrumentCode?: string;
}

export const XrfTakeoutAuditLogsModal: React.FC<XrfTakeoutAuditLogsModalProps> = ({
  isOpen,
  onClose,
  initialInstrumentCode,
}) => {
  const [logs, setLogs] = useState<XrfOffspecAuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterInstrument, setFilterInstrument] = useState<string>(initialInstrumentCode || 'ALL');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchTakeoutAuditLogs();
      setLogs(data);
    } catch {
      toast.error('Gagal memuat log audit take out.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen]);

  // Distinct filter options
  const instrumentOptions = useMemo(() => {
    const list = Array.from(new Set(logs.map(l => l.instrumentCode).filter(Boolean))) as string[];
    return list.sort();
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (filterAction !== 'ALL' && l.action !== filterAction) return false;
      if (filterInstrument !== 'ALL' && l.instrumentCode !== filterInstrument) return false;
      if (filterRole !== 'ALL') {
        const role = (l.userRole || '').toUpperCase();
        if (filterRole === 'SPV' && !role.includes('SPV') && !role.includes('SUPERVISOR')) return false;
        if (filterRole === 'SPT' && !role.includes('SPT') && !role.includes('SUPERINTENDENT')) return false;
        if (filterRole === 'MANAGER' && !role.includes('MANAGER')) return false;
        if (filterRole === 'DEV' && !role.includes('DEV')) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (l.userName || '').toLowerCase().includes(q);
        const matchNik = (l.userNik || '').toLowerCase().includes(q);
        const matchReason = (l.reason || '').toLowerCase().includes(q);
        const matchStd = (l.standardCode || '').toLowerCase().includes(q);
        const matchElem = (l.element || '').toLowerCase().includes(q);
        if (!matchName && !matchNik && !matchReason && !matchStd && !matchElem) return false;
      }
      return true;
    });
  }, [logs, filterAction, filterInstrument, filterRole, searchQuery]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = logs.length;
    const isolateCount = logs.filter(l => l.action === 'ISOLATE' || l.action === 'BULK_ISOLATE').length;
    const restoreCount = logs.filter(l => l.action === 'RESTORE' || l.action === 'CLEAR_ALL').length;
    const distinctUsers = new Set(logs.map(l => l.userNik)).size;
    return { total, isolateCount, restoreCount, distinctUsers };
  }, [logs]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      toast.info('Tidak ada data untuk diekspor.');
      return;
    }

    const headers = [
      'Waktu Audit',
      'Aksi',
      'NIK PIC',
      'Nama PIC',
      'Jabatan',
      'Peran (Role)',
      'Alat Instrumen',
      'Standar CRM',
      'Unsur',
      'Titik #',
      'Nilai Hasil (%)',
      'Target Nominal (%)',
      'Jarak Sigma',
      'Status Mutu',
      'Alasan / Justifikasi',
    ];

    const rows = filteredLogs.map(l => [
      l.createdAt ? new Date(l.createdAt).toLocaleString('id-ID') : (l.timestamp || '-'),
      l.action,
      l.userNik,
      `"${(l.userName || '').replace(/"/g, '""')}"`,
      `"${(l.userJabatan || '').replace(/"/g, '""')}"`,
      `"${(l.userRole || '').replace(/"/g, '""')}"`,
      l.instrumentName || l.instrumentCode || '-',
      l.standardCode || '-',
      l.element || '-',
      l.pointIndex || '-',
      l.measuredValue !== undefined ? l.measuredValue : '-',
      l.nominalValue !== undefined ? l.nominalValue : '-',
      l.sigmaDist !== undefined ? l.sigmaDist.toFixed(2) : '-',
      l.statusLabel || '-',
      `"${(l.reason || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Audit_Log_TakeOut_OffSpec_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('File CSV Audit Log berhasil diunduh.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Audit Trail Log: Riwayat Take Out Data Off-Spec
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  ISO 17025 Compliance
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Catatan komprehensif tindakan isolasi & pengembalian data oleh SPV, SPT Lab, Dev, dan Manager
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={filteredLogs.length === 0}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Unduh Audit Log sebagai CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ekspor CSV</span>
            </button>

            <button
              onClick={loadLogs}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Segarkan Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 4 Cards Summary Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20">
          <div className="p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Total Log Kejadian</span>
              <FileText className="w-3.5 h-3.5 text-teal-600" />
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
              {metrics.total}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Tercatat di server & lokal</div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Data Di-Take Out (Isolate)</span>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <div className="text-xl font-black text-rose-600 mt-1">
              {metrics.isolateCount}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Dikeluarkan dari chart kendali</div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>Data Dipulihkan (Restore)</span>
              <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-emerald-600 mt-1">
              {metrics.restoreCount}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Dikembalikan ke chart utama</div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span>PIC Berwenang Aktif</span>
              <User className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="text-xl font-black text-purple-600 mt-1">
              {metrics.distinctUsers} Personil
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">SPV, SPT, Dev, & Manager</div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Action */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
              {[
                { id: 'ALL', label: 'Semua Aksi' },
                { id: 'ISOLATE', label: 'Take Out' },
                { id: 'RESTORE', label: 'Pulihkan' },
                { id: 'BULK_ISOLATE', label: 'Auto / Bulk' },
              ].map(a => (
                <button
                  key={a.id}
                  onClick={() => setFilterAction(a.id)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    filterAction === a.id
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>

            {/* Filter Role */}
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="ALL">Semua Peran Otorisasi</option>
              <option value="SPV">Supervisor (SPV) Lab</option>
              <option value="SPT">Superintendent (SPT) Lab</option>
              <option value="MANAGER">Manager</option>
              <option value="DEV">Developer</option>
            </select>

            {/* Filter Instrument */}
            {instrumentOptions.length > 0 && (
              <select
                value={filterInstrument}
                onChange={(e) => setFilterInstrument(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="ALL">Semua Instrumen</option>
                {instrumentOptions.map(inst => (
                  <option key={inst} value={inst}>{inst}</option>
                ))}
              </select>
            )}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari PIC, NIK, alasan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="flex-1 overflow-y-auto min-h-[300px] p-5">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
              <span className="text-xs">Memuat riwayat audit log...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400 text-center">
              <ShieldCheck className="w-10 h-10 text-slate-300 dark:text-slate-700" />
              <div className="text-sm font-bold text-slate-600 dark:text-slate-400">
                Belum ada rekaman audit log take out
              </div>
              <p className="text-xs max-w-sm">
                Setiap kali personil SPV, SPT, Dev, atau Manager mengisolasi atau memulihkan data off-spec, seluruh rekam jejak akan tersimpan permanen di sini.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 border-b border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="py-3 px-3.5">Waktu & Tanggal</th>
                    <th className="py-3 px-3.5">Aksi</th>
                    <th className="py-3 px-3.5">Personil Penanggung Jawab</th>
                    <th className="py-3 px-3.5">Target Data (Alat & CRM)</th>
                    <th className="py-3 px-3.5">Nilai & Sigma</th>
                    <th className="py-3 px-3.5">Alasan / Justifikasi Teknis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLogs.map((log, idx) => {
                    const isIsolate = log.action === 'ISOLATE' || log.action === 'BULK_ISOLATE';
                    const isRestore = log.action === 'RESTORE' || log.action === 'CLEAR_ALL';

                    const roleBadgeColor = {
                      DEV: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200',
                      MANAGER: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200',
                      SPT: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200',
                      SPV: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200',
                    }[(log.userRole || '').toUpperCase()] || 'bg-slate-100 text-slate-700';

                    return (
                      <tr key={log.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        {/* Timestamp */}
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {log.createdAt ? new Date(log.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                          </div>
                          <div className="text-[10.5px] font-mono text-slate-400">
                            {log.createdAt ? new Date(log.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}
                          </div>
                        </td>

                        {/* Action Badge */}
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          {isIsolate ? (
                            <span className="px-2 py-0.5 rounded-md text-[10.5px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 flex items-center gap-1 w-fit">
                              <ShieldAlert className="w-3 h-3 text-rose-600" />
                              <span>{log.action === 'BULK_ISOLATE' ? 'Bulk Take Out' : 'Take Out'}</span>
                            </span>
                          ) : isRestore ? (
                            <span className="px-2 py-0.5 rounded-md text-[10.5px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-1 w-fit">
                              <RotateCcw className="w-3 h-3 text-emerald-600" />
                              <span>{log.action === 'CLEAR_ALL' ? 'Reset Semua' : 'Dipulihkan'}</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-slate-100 text-slate-700">
                              {log.action}
                            </span>
                          )}
                        </td>

                        {/* Personil PIC */}
                        <td className="py-2.5 px-3.5">
                          <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{log.userName}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-black border ${roleBadgeColor}`}>
                              {log.userRole || 'PIC'}
                            </span>
                          </div>
                          <div className="text-[10.5px] text-slate-500 font-mono">
                            NIK: {log.userNik} {log.userJabatan ? `• ${log.userJabatan}` : ''}
                          </div>
                        </td>

                        {/* Target Data */}
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <Activity className="w-3 h-3 text-teal-600" />
                            <span>{log.instrumentName || log.instrumentCode || '-'}</span>
                          </div>
                          <div className="text-[10.5px] text-slate-500 font-mono">
                            {log.standardCode || '-'} {log.element ? `• Unsur ${log.element}` : ''} {log.pointIndex ? `(Titik #${log.pointIndex})` : ''}
                          </div>
                        </td>

                        {/* Value & Sigma */}
                        <td className="py-2.5 px-3.5 whitespace-nowrap font-mono">
                          {log.measuredValue !== undefined && log.measuredValue !== null ? (
                            <div>
                              <span className="font-black text-slate-900 dark:text-white">
                                {Number(log.measuredValue).toFixed(4)}%
                              </span>
                              {log.sigmaDist !== undefined && log.sigmaDist !== null && (
                                <span className={`text-[11px] ml-1.5 font-bold ${Math.abs(log.sigmaDist) > 3 ? 'text-rose-600' : 'text-amber-600'}`}>
                                  ({log.sigmaDist > 0 ? `+${log.sigmaDist.toFixed(2)}` : log.sigmaDist.toFixed(2)}σ)
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                          <div className="text-[10px] text-slate-400 font-sans">
                            {log.statusLabel || (log.nominalValue ? `EV: ${log.nominalValue.toFixed(4)}%` : '')}
                          </div>
                        </td>

                        {/* Reason */}
                        <td className="py-2.5 px-3.5 max-w-xs">
                          <div className="text-slate-700 dark:text-slate-300 italic line-clamp-2" title={log.reason || '-'}>
                            "{log.reason || 'Tidak ada catatan keterangan'}"
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 text-xs text-slate-500">
          <div>
            Menampilkan <span className="font-bold text-slate-900 dark:text-white">{filteredLogs.length}</span> rekaman audit
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 transition-all cursor-pointer shadow-xs"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
