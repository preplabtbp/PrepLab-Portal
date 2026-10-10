import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  User, 
  Calendar, 
  X, 
  CheckSquare, 
  Square, 
  Plus, 
  Layers, 
  AlertCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { 
  TaskRecommendation, 
  getSectionActiveRecommendations, 
  getTodayDDMMYYYY, 
  formatToDDMMYYYY,
  TableRowData 
} from './logbook-section-utils';

interface LogbookTaskRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionName: string;
  allPosts: any[];
  targetUniverse?: string;
  existingRows: TableRowData[];
  onAddSelectedTasks: (tasksToAdd: TableRowData[]) => void;
}

export function LogbookTaskRecommendationModal({
  isOpen,
  onClose,
  sectionName,
  allPosts,
  targetUniverse = 'TBP',
  existingRows,
  onAddSelectedTasks
}: LogbookTaskRecommendationModalProps) {
  const [filterType, setFilterType] = useState<'ALL' | 'Routine' | 'Non-Routine'>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Ekstrak judul yang sudah direncanakan di tabel hari ini
  const alreadyPlannedTitles = useMemo(() => {
    return existingRows.map(r => {
      const titleKey = Object.keys(r).find(k => k.toLowerCase().includes('kegiatan') || k.toLowerCase() === 'title');
      return titleKey ? String(r[titleKey] || '').trim().toLowerCase() : '';
    }).filter(Boolean);
  }, [existingRows]);

  // Ambil rekomendasi tugas cerdas
  const recommendations = useMemo(() => {
    if (!isOpen) return [];
    return getSectionActiveRecommendations(sectionName, allPosts, targetUniverse, alreadyPlannedTitles);
  }, [isOpen, sectionName, allPosts, targetUniverse, alreadyPlannedTitles]);

  // Filter rekomendasi berdasarkan tab
  const filteredRecs = useMemo(() => {
    if (filterType === 'ALL') return recommendations;
    return recommendations.filter(r => r.type === filterType);
  }, [recommendations, filterType]);

  // Inisialisasi: Pilih semua tugas yang belum direncanakan secara default saat modal terbuka
  React.useEffect(() => {
    if (isOpen) {
      const defaultSelected = new Set<string>();
      recommendations.forEach(r => {
        if (!r.isAlreadyPlanned) {
          defaultSelected.add(r.id);
        }
      });
      setSelectedIds(defaultSelected);
    }
  }, [isOpen, recommendations]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    const next = new Set<string>();
    filteredRecs.forEach(r => {
      if (!r.isAlreadyPlanned) next.add(r.id);
    });
    setSelectedIds(next);
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleConfirmAdd = () => {
    const selectedRecs = recommendations.filter(r => selectedIds.has(r.id));
    if (selectedRecs.length === 0) return;

    const todayStr = getTodayDDMMYYYY();

    const newRows: TableRowData[] = selectedRecs.map((rec, idx) => {
      return {
        number: String(existingRows.length + idx + 1),
        'Jenis kegiatan': rec.title,
        Keterangan: rec.description || '',
        'Created Time': todayStr,
        'Tanggal Selesai': '-',
        Status: 'Open',
        PIC: rec.pic || '',
        Priority: rec.priority || 'Normal',
        'Activity (routine/non routine)': rec.type,
        period: rec.cadence || 'Daily',
        'Asal Halaman': rec.originPostTitle,
        _originPostId: String(rec.originPostId),
        _originPostTitle: rec.originPostTitle,
        _originRowIndex: String(rec.originRowIndex),
        _isLogbookAggregated: 'true'
      };
    });

    onAddSelectedTasks(newRows);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#181e28] text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl border border-teal-500/30 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-r from-teal-700 via-emerald-600 to-teal-800 text-white shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white transition cursor-pointer"
            title="Tutup modal"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white shadow-inner shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-400/25 border border-teal-300/40 text-teal-100 uppercase tracking-wider">
                  Seksi {sectionName}
                </span>
                <span className="text-xs text-teal-200/90 font-mono">
                  {getTodayDDMMYYYY()}
                </span>
              </div>
              <h3 className="text-lg font-bold tracking-tight text-white mt-0.5">
                Rekomendasi Rencana Tugas Hari Ini
              </h3>
            </div>
          </div>

          <p className="text-xs text-teal-100/90 mt-2 leading-relaxed">
            Sistem otomatis memindai seluruh tugas aktif (*Routine* harian/mingguan & *Non-Routine*) dari halaman kerja {sectionName} untuk diusulkan ke dalam target kerja hari ini.
          </p>

          {/* Filter Bar */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-teal-500/40 text-xs">
            <div className="flex items-center gap-1.5 bg-black/20 p-1 rounded-xl">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  filterType === 'ALL' ? 'bg-white text-teal-900 shadow-xs' : 'text-teal-200 hover:text-white'
                }`}
              >
                Semua ({recommendations.length})
              </button>
              <button
                onClick={() => setFilterType('Routine')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  filterType === 'Routine' ? 'bg-white text-teal-900 shadow-xs' : 'text-teal-200 hover:text-white'
                }`}
              >
                Routine ({recommendations.filter(r => r.type === 'Routine').length})
              </button>
              <button
                onClick={() => setFilterType('Non-Routine')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  filterType === 'Non-Routine' ? 'bg-white text-teal-900 shadow-xs' : 'text-teal-200 hover:text-white'
                }`}
              >
                Non-Routine ({recommendations.filter(r => r.type === 'Non-Routine').length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="text-[11px] font-semibold text-teal-200 hover:text-white hover:underline cursor-pointer"
              >
                Pilih Semua
              </button>
              <span className="text-teal-300/40">|</span>
              <button
                onClick={handleDeselectAll}
                className="text-[11px] font-semibold text-teal-200 hover:text-white hover:underline cursor-pointer"
              >
                Lepas Semua
              </button>
            </div>
          </div>
        </div>

        {/* List of Recommendations */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 custom-scrollbar">
          {filteredRecs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 opacity-80" />
              <p className="font-semibold text-sm">Tidak Ada Tugas Tertunda</p>
              <p className="text-xs max-w-sm mx-auto">
                Semua kegiatan seksi {sectionName} telah diselesaikan atau telah terdaftar di rencana hari ini.
              </p>
            </div>
          ) : (
            filteredRecs.map((rec) => {
              const isSelected = selectedIds.has(rec.id);
              const isPlanned = rec.isAlreadyPlanned;

              return (
                <div
                  key={rec.id}
                  onClick={() => {
                    if (!isPlanned) toggleSelect(rec.id);
                  }}
                  className={`relative p-3.5 rounded-2xl border transition-all text-left flex items-start gap-3 select-none ${
                    isPlanned
                      ? 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-60 cursor-not-allowed'
                      : isSelected
                      ? 'bg-teal-50/80 dark:bg-teal-950/40 border-teal-500/60 shadow-xs cursor-pointer'
                      : 'bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800 cursor-pointer'
                  }`}
                >
                  <div className="pt-0.5 shrink-0 text-teal-600 dark:text-teal-400">
                    {isPlanned ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : isSelected ? (
                      <CheckSquare className="w-5 h-5" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {rec.title}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          rec.type === 'Routine'
                            ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200'
                            : 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200'
                        }`}
                      >
                        {rec.type}
                      </span>
                      {rec.cadence && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {rec.cadence}
                        </span>
                      )}
                      {isPlanned && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-white">
                          Sudah Masuk Rencana
                        </span>
                      )}
                    </div>

                    {rec.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {rec.description.replace(/- \[[ xX]\]/g, '•')}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                      {rec.pic && (
                        <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                          <User className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                          <span>{rec.pic}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate max-w-[180px]" title={rec.originPostTitle}>
                          {rec.originPostTitle}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Terpilih: <strong className="text-teal-600 dark:text-teal-400 font-bold">{selectedIds.size}</strong> tugas
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleConfirmAdd}
              disabled={selectedIds.size === 0}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md flex items-center gap-2 transition cursor-pointer ${
                selectedIds.size > 0
                  ? 'bg-teal-600 hover:bg-teal-500 shadow-teal-600/30 active:scale-[0.98]'
                  : 'bg-slate-400 dark:bg-slate-700 opacity-60 cursor-not-allowed'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Masukkan ({selectedIds.size}) Tugas ke Rencana Hari Ini</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
