import React, { useState, useMemo } from 'react';
import { Trash2, RotateCcw, X, Search, Layers, Clock, User, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export interface RecycleBinItem {
  id: number;
  postId?: number | null;
  postTitle?: string | null;
  section?: string | null;
  taskTitle: string;
  rowData: string;
  subtasksData?: string | null;
  subtaskCount?: number;
  deletedByNik: string;
  deletedByName: string;
  deletedByJabatan?: string | null;
  deletedAt: string;
  restoreStatus: 'DELETED' | 'RESTORED';
  restoredAt?: string | null;
  restoredByNik?: string | null;
  restoredByName?: string | null;
}

interface NotionRecycleBinModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: RecycleBinItem[];
  isLoading: boolean;
  isRestoringId?: number | null;
  onRestore: (id: number) => Promise<void>;
  onRefresh: (filter: 'current' | 'all') => void;
  currentPostTitle?: string;
  currentPostId?: number | string;
  isNotionLight?: boolean;
}

export const cleanRecycleTitle = (rawTitle: string): string => {
  if (!rawTitle) return 'Kegiatan Tanpa Judul';
  return rawTitle
    .replace(/^[↳↪\s]+/, '')
    .replace(/^\[[ xX]\]\s*/, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!-?[a-zA-Z0-9_\-\s]+.*?>?/g, '')
    .replace(/<!--.*$/g, '')
    .replace(/\s+/g, ' ')
    .trim() || 'Kegiatan Tanpa Judul';
};

function checkIsSubtask(item: RecycleBinItem): boolean {
  if (item.taskTitle && (item.taskTitle.startsWith('↳') || item.taskTitle.startsWith('↪'))) return true;
  try {
    const parsed = typeof item.rowData === 'string' ? JSON.parse(item.rowData) : item.rowData;
    if (parsed && (parsed.isSubItem === 'true' || parsed.isSubItem === true || parsed.parentId || parsed.parentRowId)) {
      return true;
    }
  } catch {}
  return false;
}

export const NotionRecycleBinModal: React.FC<NotionRecycleBinModalProps> = ({
  isOpen,
  onClose,
  items,
  isLoading,
  isRestoringId,
  onRestore,
  onRefresh,
  currentPostTitle = 'Halaman Ini',
  currentPostId,
  isNotionLight = true
}) => {
  const [filterMode, setFilterMode] = useState<'current' | 'all'>('current');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredItems = useMemo(() => {
    let list = items || [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(item => 
        cleanRecycleTitle(item.taskTitle || '').toLowerCase().includes(q) ||
        (item.deletedByName || '').toLowerCase().includes(q) ||
        (item.deletedByNik || '').toLowerCase().includes(q) ||
        (item.postTitle || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className={`w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden transform transition-all select-none ${
          isNotionLight 
            ? 'bg-white border-slate-200 text-slate-800 shadow-slate-500/30' 
            : 'bg-[#1a1a1a] border-slate-700 text-slate-100 shadow-black/90'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#202020]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>Recycle Bin Kegiatan Lab</span>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  Audit Trail
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Riwayat kegiatan terhapus dari logbook & labnote. Data dapat dipulihkan sewaktu-waktu.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-3 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-[#1a1a1a]">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => {
                setFilterMode('current');
                onRefresh('current');
              }}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                filterMode === 'current'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Halaman Ini ({currentPostTitle})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterMode('all');
                onRefresh('all');
              }}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-300 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Semua Dokumen Lab
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kegiatan / NIK / Nama..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 w-52 sm:w-64"
              />
            </div>
            <button
              type="button"
              onClick={() => onRefresh(filterMode)}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Muat ulang daftar"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-teal-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Items List Table */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-teal-500" />
              <span className="text-xs">Memuat data Recycle Bin...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600 mb-2">
                <Trash2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Recycle Bin Kosong</p>
              <p className="text-xs text-slate-400 max-w-sm mt-0.5">
                {searchQuery ? 'Tidak ada data terhapus yang cocok dengan pencarian.' : 'Belum ada aktivitas yang dihapus dari halaman ini.'}
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-3.5 py-2.5">Waktu Hapus</th>
                    <th className="px-3.5 py-2.5">Kegiatan</th>
                    <th className="px-3.5 py-2.5">Dokumen Asal</th>
                    <th className="px-3.5 py-2.5">Dihapus Oleh</th>
                    <th className="px-3.5 py-2.5">Status</th>
                    <th className="px-3.5 py-2.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                  {filteredItems.map((item) => {
                    const isRestored = item.restoreStatus === 'RESTORED';
                    const hasSubtasks = Boolean(item.subtaskCount && item.subtaskCount > 0);
                    const isSub = checkIsSubtask(item);
                    const displayTitle = cleanRecycleTitle(item.taskTitle);
                    const dateObj = new Date(item.deletedAt);
                    const formattedDate = !isNaN(dateObj.getTime())
                      ? `${dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })} ${dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                      : item.deletedAt;

                    return (
                      <tr 
                        key={item.id} 
                        className={`transition-colors ${
                          isRestored 
                            ? 'opacity-60 bg-slate-50/40 dark:bg-slate-900/20' 
                            : 'hover:bg-teal-50/30 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="px-3.5 py-3 whitespace-nowrap text-[11px] text-slate-500 font-mono">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{formattedDate}</span>
                          </div>
                        </td>
                        <td className="px-3.5 py-3 max-w-xs">
                          <div className="flex items-center gap-1.5">
                            {isSub && (
                              <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                                Sub
                              </span>
                            )}
                            <span className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-2" title={displayTitle}>
                              {displayTitle}
                            </span>
                          </div>
                          {hasSubtasks && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 mt-1 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              <Layers className="w-2.5 h-2.5" />
                              {item.subtaskCount} Sub-kegiatan
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium border border-slate-200/60 dark:border-slate-700/60">
                            {item.postTitle || item.section || 'Labnote'}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{item.deletedByName}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 pl-4.5">
                            {item.deletedByNik} {item.deletedByJabatan ? `• ${item.deletedByJabatan}` : ''}
                          </div>
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          {isRestored ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              Dipulihkan
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                              <AlertCircle className="w-3 h-3" />
                              Terhapus
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-right whitespace-nowrap">
                          {!isRestored ? (
                            <button
                              type="button"
                              onClick={() => onRestore(item.id)}
                              disabled={isRestoringId === item.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-500/40 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                            >
                              <RotateCcw className={`w-3 h-3 ${isRestoringId === item.id ? 'animate-spin' : ''}`} />
                              <span>{isRestoringId === item.id ? 'Memulihkan...' : 'Pulihkan'}</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">
                              Selesai pulih
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#202020] text-xs text-slate-500">
          <span>Menampilkan {filteredItems.length} riwayat terhapus</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
