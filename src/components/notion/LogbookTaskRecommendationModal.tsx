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
  ArrowRight, 
  Search, 
  Filter, 
  PenTool 
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  TaskRecommendation, 
  getSectionActiveRecommendations, 
  getTodayDDMMYYYY, 
  formatToDDMMYYYY, 
  TableRowData, 
  generateTaskCode 
} from './logbook-section-utils';

interface LogbookTaskRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionName: string;
  allPosts: any[];
  targetUniverse?: string;
  existingRows: TableRowData[];
  onAddSelectedTasks: (tasksToAdd: TableRowData[]) => void;
  onOpenManualAddTaskModal?: () => void;
  employeesList?: any[];
  currentUserNik?: string;
  currentUserName?: string;
}

type MainTab = 'labnote' | 'manual';
type CategoryFilter = 'ALL' | 'Routine' | 'Non-Routine';
type CadenceFilter = 'ALL' | 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';

export function LogbookTaskRecommendationModal({
  isOpen,
  onClose,
  sectionName,
  allPosts,
  targetUniverse = 'TBP',
  existingRows,
  onAddSelectedTasks,
  onOpenManualAddTaskModal,
  employeesList = [],
  currentUserNik,
  currentUserName
}: LogbookTaskRecommendationModalProps) {
  const [activeTab, setActiveTab] = useState<MainTab>('labnote');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [cadenceFilter, setCadenceFilter] = useState<CadenceFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Manual Form States
  const [manualTitle, setManualTitle] = useState<string>('');
  const [manualDescription, setManualDescription] = useState<string>('');
  const [manualPic, setManualPic] = useState<string>(currentUserName || '');
  const [manualPriority, setManualPriority] = useState<string>('Normal');
  const [manualType, setManualType] = useState<'Routine' | 'Non-Routine'>('Routine');
  const [manualCadence, setManualCadence] = useState<string>('Daily');
  const [isPicDropdownOpen, setIsPicDropdownOpen] = useState<boolean>(false);

  React.useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set());
      setSearchQuery('');
      setCategoryFilter('ALL');
      setCadenceFilter('ALL');
      setActiveTab('labnote');
      setManualTitle('');
      setManualDescription('');
      setManualPic(currentUserName || '');
      setManualPriority('Normal');
      setManualType('Routine');
      setManualCadence('Daily');
      setIsPicDropdownOpen(false);
    }
  }, [isOpen, currentUserName]);

  // Ekstrak judul yang sudah direncanakan di tabel hari ini
  const alreadyPlannedTitles = useMemo(() => {
    return existingRows.map(r => {
      const titleKey = Object.keys(r).find(k => k.toLowerCase().includes('kegiatan') || k.toLowerCase() === 'title');
      return titleKey ? String(r[titleKey] || '').trim().toLowerCase() : '';
    }).filter(Boolean);
  }, [existingRows]);

  // Ambil rekomendasi tugas cerdas dari labnote seksi
  const recommendations = useMemo(() => {
    if (!isOpen) return [];
    return getSectionActiveRecommendations(sectionName, allPosts, targetUniverse, alreadyPlannedTitles);
  }, [isOpen, sectionName, allPosts, targetUniverse, alreadyPlannedTitles]);

  const allCount = recommendations.length;
  const routineCount = useMemo(() => recommendations.filter(r => r.type === 'Routine').length, [recommendations]);
  const nonRoutineCount = useMemo(() => recommendations.filter(r => r.type === 'Non-Routine').length, [recommendations]);

  const routineDailyCount = useMemo(() => 
    recommendations.filter(r => r.type === 'Routine' && (r.cadence || '').toLowerCase().includes('daily')).length,
    [recommendations]
  );
  const routineWeeklyCount = useMemo(() => 
    recommendations.filter(r => r.type === 'Routine' && (r.cadence || '').toLowerCase().includes('weekly')).length,
    [recommendations]
  );
  const routineMonthlyCount = useMemo(() => 
    recommendations.filter(r => r.type === 'Routine' && (r.cadence || '').toLowerCase().includes('monthly')).length,
    [recommendations]
  );
  const routineOtherCount = useMemo(() => 
    recommendations.filter(r => r.type === 'Routine' && (
      (r.cadence || '').toLowerCase().includes('quarter') || 
      (r.cadence || '').toLowerCase().includes('biannual') ||
      (r.cadence || '').toLowerCase().includes('year') ||
      (r.cadence || '').toLowerCase().includes('triwulan')
    )).length,
    [recommendations]
  );

  // Filter rekomendasi berdasarkan kategori, frekuensi cadence, dan teks pencarian
  const filteredRecs = useMemo(() => {
    let list = recommendations;

    if (categoryFilter !== 'ALL') {
      list = list.filter(r => r.type === categoryFilter);
    }

    if (cadenceFilter !== 'ALL') {
      list = list.filter(r => {
        if (r.type !== 'Routine') return false;
        const cad = (r.cadence || '').toLowerCase();
        if (cadenceFilter === 'Quarterly') {
          return cad.includes('quarter') || cad.includes('biannual') || cad.includes('triwulan') || cad.includes('semester');
        }
        if (cadenceFilter === 'Yearly') {
          return cad.includes('year') || cad.includes('tahun');
        }
        return cad.includes(cadenceFilter.toLowerCase());
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r => 
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.pic.toLowerCase().includes(q) ||
        r.originPostTitle.toLowerCase().includes(q)
      );
    }

    return list;
  }, [recommendations, categoryFilter, cadenceFilter, searchQuery]);

  const picSuggestions = useMemo(() => {
    if (!manualPic.trim()) return employeesList.slice(0, 8);
    const q = manualPic.toLowerCase().trim();
    return employeesList.filter((emp: any) => {
      const name = (emp.name || emp.nama || '').toLowerCase();
      const nik = (emp.nik || '').toLowerCase();
      const jab = (emp.jabatan || emp.position || '').toLowerCase();
      return name.includes(q) || nik.includes(q) || jab.includes(q);
    }).slice(0, 8);
  }, [manualPic, employeesList]);

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

  const handleConfirmAddSelected = () => {
    const selectedRecs = recommendations.filter(r => selectedIds.has(r.id));
    if (selectedRecs.length === 0) return;

    const todayStr = getTodayDDMMYYYY();
    const tempRows = [...existingRows];

    const newRows: TableRowData[] = selectedRecs.map((rec) => {
      const code = generateTaskCode(sectionName, tempRows);
      const rowItem: TableRowData = {
        taskCode: code,
        'Task ID': code,
        'ID Task': code,
        number: code,
        'Jenis kegiatan': rec.title,
        'Jenis Kegiatan': rec.title,
        Keterangan: rec.description || '',
        'Created Time': todayStr,
        'Created time': todayStr,
        'Tanggal Selesai': '-',
        'Tanggal selesai': '-',
        Status: 'Open',
        status: 'Open',
        PIC: rec.pic || '',
        Priority: rec.priority || 'Normal',
        'Activity (routine/non routine)': rec.type,
        Aktivitas: rec.type,
        period: rec.cadence || (rec.type === 'Routine' ? 'Daily' : 'Non-Routine'),
        'Asal Halaman': rec.originPostTitle,
        _originPostId: String(rec.originPostId),
        _originPostTitle: rec.originPostTitle,
        _originRowIndex: String(rec.originRowIndex),
        _isLogbookAggregated: 'true'
      };
      tempRows.push(rowItem);
      return rowItem;
    });

    onAddSelectedTasks(newRows);
    onClose();
  };

  const handleQuickAddSingle = (rec: TaskRecommendation, e: React.MouseEvent) => {
    e.stopPropagation();
    const todayStr = getTodayDDMMYYYY();
    const tempRows = [...existingRows];
    const code = generateTaskCode(sectionName, tempRows);

    const rowItem: TableRowData = {
      taskCode: code,
      'Task ID': code,
      'ID Task': code,
      number: code,
      'Jenis kegiatan': rec.title,
      'Jenis Kegiatan': rec.title,
      Keterangan: rec.description || '',
      'Created Time': todayStr,
      'Created time': todayStr,
      'Tanggal Selesai': '-',
      'Tanggal selesai': '-',
      Status: 'Open',
      status: 'Open',
      PIC: rec.pic || '',
      Priority: rec.priority || 'Normal',
      'Activity (routine/non routine)': rec.type,
      Aktivitas: rec.type,
      period: rec.cadence || (rec.type === 'Routine' ? 'Daily' : 'Non-Routine'),
      'Asal Halaman': rec.originPostTitle,
      _originPostId: String(rec.originPostId),
      _originPostTitle: rec.originPostTitle,
      _originRowIndex: String(rec.originRowIndex),
      _isLogbookAggregated: 'true'
    };

    onAddSelectedTasks([rowItem]);
    onClose();
  };

  const handleSaveManualTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) {
      toast.error('Nama / Jenis kegiatan wajib diisi');
      return;
    }

    const todayStr = getTodayDDMMYYYY();
    const code = generateTaskCode(sectionName, existingRows);
    const isRoutine = manualType === 'Routine';
    const finalPeriod = isRoutine ? manualCadence : 'Non-Routine';

    const rowItem: TableRowData = {
      taskCode: code,
      'Task ID': code,
      'ID Task': code,
      number: code,
      'Jenis kegiatan': manualTitle.trim(),
      'Jenis Kegiatan': manualTitle.trim(),
      Keterangan: manualDescription.trim(),
      'Created Time': todayStr,
      'Created time': todayStr,
      'Tanggal Selesai': '-',
      'Tanggal selesai': '-',
      Status: 'Open',
      status: 'Open',
      PIC: manualPic.trim(),
      Priority: manualPriority,
      'Activity (routine/non routine)': manualType,
      Aktivitas: manualType,
      period: finalPeriod,
      'Asal Halaman': `Logbook ${sectionName}`,
      _originPostTitle: `Manual Task`,
      _isManualLogbookTask: 'true'
    };

    onAddSelectedTasks([rowItem]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white dark:bg-[#181e28] text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl border border-teal-500/30 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="relative px-5 sm:px-6 pt-5 pb-4 bg-gradient-to-r from-teal-700 via-emerald-600 to-teal-800 text-white shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white transition cursor-pointer"
            title="Tutup modal"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white shadow-inner shrink-0">
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
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-white mt-0.5">
                Tambah Kegiatan Planning Hari Ini
              </h3>
            </div>
          </div>

          <p className="text-xs text-teal-100/90 mt-2 leading-relaxed">
            Pilih kegiatan aktif seksi (Routine & Non-Routine) dari Labnote atau tambahkan kegiatan baru yang belum terdaftar.
          </p>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-teal-500/40 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('labnote')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'labnote'
                  ? 'bg-white text-teal-900 shadow-sm font-bold'
                  : 'text-teal-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Pilih dari Labnote ({allCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'manual'
                  ? 'bg-white text-teal-900 shadow-sm font-bold'
                  : 'text-teal-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>+ Buat Kegiatan Baru (Manual)</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Pilih dari Labnote */}
        {activeTab === 'labnote' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Filter & Search Bar */}
            <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 space-y-2.5 shrink-0">
              {/* Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari kegiatan, PIC, keterangan, atau asal halaman..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-teal-500 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Main Category Filter & Routine Cadence Filter */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                {/* Category Pills */}
                <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800/80 p-0.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryFilter('ALL');
                      setCadenceFilter('ALL');
                    }}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer text-xs ${
                      categoryFilter === 'ALL'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Semua ({allCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => setCategoryFilter('Routine')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer text-xs ${
                      categoryFilter === 'Routine'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Routine ({routineCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCategoryFilter('Non-Routine');
                      setCadenceFilter('ALL');
                    }}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer text-xs ${
                      categoryFilter === 'Non-Routine'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Non-Routine ({nonRoutineCount})
                  </button>
                </div>

                {/* Selection Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:underline cursor-pointer"
                  >
                    Lepas Semua
                  </button>
                </div>
              </div>

              {/* Sub-Filter Cadence for Routine (Weekly, Monthly, Daily, dll) */}
              {(categoryFilter === 'Routine' || categoryFilter === 'ALL') && (
                <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 text-[11px] custom-scrollbar">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                    <Filter className="w-3 h-3 text-teal-500" />
                    Frekuensi:
                  </span>

                  <button
                    type="button"
                    onClick={() => setCadenceFilter('ALL')}
                    className={`px-2.5 py-0.5 rounded-full font-medium transition cursor-pointer shrink-0 border ${
                      cadenceFilter === 'ALL'
                        ? 'bg-teal-500/15 border-teal-500 text-teal-700 dark:text-teal-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-teal-400'
                    }`}
                  >
                    Semua Frekuensi
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCadenceFilter('Weekly');
                    }}
                    className={`px-2.5 py-0.5 rounded-full font-medium transition cursor-pointer shrink-0 border ${
                      cadenceFilter === 'Weekly'
                        ? 'bg-blue-500/15 border-blue-500 text-blue-700 dark:text-blue-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-400'
                    }`}
                  >
                    Weekly ({routineWeeklyCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCadenceFilter('Monthly');
                    }}
                    className={`px-2.5 py-0.5 rounded-full font-medium transition cursor-pointer shrink-0 border ${
                      cadenceFilter === 'Monthly'
                        ? 'bg-purple-500/15 border-purple-500 text-purple-700 dark:text-purple-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-purple-400'
                    }`}
                  >
                    Monthly ({routineMonthlyCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCadenceFilter('Daily');
                    }}
                    className={`px-2.5 py-0.5 rounded-full font-medium transition cursor-pointer shrink-0 border ${
                      cadenceFilter === 'Daily'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-400'
                    }`}
                  >
                    Daily ({routineDailyCount})
                  </button>

                  {routineOtherCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setCadenceFilter('Quarterly');
                      }}
                      className={`px-2.5 py-0.5 rounded-full font-medium transition cursor-pointer shrink-0 border ${
                        cadenceFilter === 'Quarterly'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 font-bold'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-400'
                      }`}
                    >
                      Quarterly / Lainnya ({routineOtherCount})
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* List of Active Recommendations from Labnote */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-2.5 custom-scrollbar">
              {filteredRecs.length === 0 ? (
                <div className="py-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 opacity-80" />
                  <p className="font-semibold text-sm">Tidak Ada Kegiatan yang Sesuai</p>
                  <p className="text-xs max-w-sm mx-auto leading-relaxed">
                    Tidak ditemukan kegiatan aktif yang cocok dengan filter atau pencarian saat ini.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('manual')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Buat Kegiatan Baru Manual</span>
                  </button>
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
                          ? 'bg-teal-50/80 dark:bg-teal-950/40 border-teal-500/60 shadow-xs cursor-pointer ring-1 ring-teal-500/30'
                          : 'bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800 cursor-pointer'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className="pt-0.5 shrink-0 text-teal-600 dark:text-teal-400">
                        {isPlanned ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : isSelected ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
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
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                              {rec.cadence}
                            </span>
                          )}

                          {rec.priority && rec.priority !== 'Normal' && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                              rec.priority === 'Urgent'
                                ? 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800'
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                            }`}>
                              {rec.priority}
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

                        <div className="flex items-center gap-3 sm:gap-4 mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                          {rec.pic && (
                            <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                              <User className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                              <span>{rec.pic}</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate max-w-[200px]" title={rec.originPostTitle}>
                              {rec.originPostTitle}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Quick Single-Add Button */}
                      {!isPlanned && (
                        <div className="shrink-0 self-center">
                          <button
                            type="button"
                            onClick={(e) => handleQuickAddSingle(rec, e)}
                            className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900 border border-teal-200 dark:border-teal-800 transition-all cursor-pointer active:scale-95 flex items-center gap-1"
                            title="Tambahkan tugas ini langsung ke planning hari ini"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span className="hidden sm:inline">Pilih</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer for Tab 1 */}
            <div className="px-4 sm:px-6 py-3.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Terpilih: <strong className="text-teal-600 dark:text-teal-400 font-bold">{selectedIds.size}</strong> tugas
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('manual')}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/50 border border-teal-300 dark:border-teal-800 transition cursor-pointer flex items-center gap-1"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>+ Buat Baru</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleConfirmAddSelected}
                  disabled={selectedIds.size === 0}
                  className={`px-4 sm:px-5 py-2 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md flex items-center gap-2 transition cursor-pointer ${
                    selectedIds.size > 0
                      ? 'bg-teal-600 hover:bg-teal-500 shadow-teal-600/30 active:scale-[0.98]'
                      : 'bg-slate-400 dark:bg-slate-700 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Masukkan ({selectedIds.size}) ke Planning</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Buat Kegiatan Baru (Manual / Bukan barang yang di labnote) */}
        {activeTab === 'manual' && (
          <form onSubmit={handleSaveManualTask} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
              <div className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 rounded-2xl text-xs text-teal-900 dark:text-teal-200">
                <p className="font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  Kegiatan Baru Mandiri (Ad-hoc)
                </p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  Tugas ini akan langsung ditambahkan ke planning Logbook Seksi {sectionName} hari ini meskipun belum terdaftar sebelumnya pada artikel Labnote.
                </p>
              </div>

              {/* 1. Nama / Jenis Kegiatan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama / Jenis Kegiatan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="Contoh: Kalibrasi Pipet & Pengecekan Neraca Analitik"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm focus:border-teal-500 outline-none font-medium text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* 2. Keterangan / Checklist Subtask */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Keterangan & Checklist Subtask (Opsional)
                </label>
                <textarea
                  rows={3}
                  placeholder={`Uraian pekerjaan atau rincian subtask:\n- [ ] Persiapan standar & reagen\n- [ ] Eksekusi verifikasi instrumen`}
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:border-teal-500 outline-none leading-relaxed font-sans text-slate-900 dark:text-slate-100"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Format <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-mono">- [ ] checklist</code> otomatis menjadi subtask interaktif di tabel.
                </span>
              </div>

              {/* 3. PIC Pelaksana */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Penanggung Jawab (PIC)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Ketik nama atau NIK personil pelaksana..."
                    value={manualPic}
                    onFocus={() => setIsPicDropdownOpen(true)}
                    onChange={(e) => {
                      setManualPic(e.target.value);
                      setIsPicDropdownOpen(true);
                    }}
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:border-teal-500 outline-none font-medium text-slate-900 dark:text-slate-100"
                  />
                  {manualPic && (
                    <button
                      type="button"
                      onClick={() => setManualPic('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {isPicDropdownOpen && picSuggestions.length > 0 && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsPicDropdownOpen(false)} 
                    />
                    <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar p-1">
                      {picSuggestions.map((emp: any, idx: number) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setManualPic(emp.name || emp.nik);
                            setIsPicDropdownOpen(false);
                          }}
                          className="w-full px-3 py-2 text-left rounded-lg text-xs hover:bg-teal-50 dark:hover:bg-teal-950/60 flex items-center justify-between cursor-pointer"
                        >
                          <span className="font-semibold text-slate-800 dark:text-slate-100">{emp.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{emp.nik} • {emp.jabatan || emp.position}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* 4. Prioritas & Tipe Aktivitas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Prioritas */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Prioritas Tugas
                  </label>
                  <select
                    value={manualPriority}
                    onChange={(e) => setManualPriority(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:border-teal-500 outline-none cursor-pointer font-medium text-slate-900 dark:text-slate-100"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent (Mendesak)</option>
                    <option value="Low">Low (Rendah)</option>
                  </select>
                </div>

                {/* Tipe Aktivitas */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tipe Kegiatan
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setManualType('Routine')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        manualType === 'Routine'
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      Routine
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualType('Non-Routine')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        manualType === 'Non-Routine'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      Non-Routine
                    </button>
                  </div>
                </div>
              </div>

              {/* 5. Frekuensi (Jika Routine) */}
              {manualType === 'Routine' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Frekuensi Rutinitas
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'].map((cad) => (
                      <button
                        key={cad}
                        type="button"
                        onClick={() => setManualCadence(cad)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                          manualCadence === cad
                            ? 'bg-teal-600 border-teal-500 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-teal-400'
                        }`}
                      >
                        {cad}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer for Tab 2 */}
            <div className="px-4 sm:px-6 py-3.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('labnote')}
                className="text-xs text-slate-500 dark:text-slate-400 font-semibold hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                ← Kembali ke Daftar Labnote
              </button>

              <div className="flex items-center gap-2">
                {onOpenManualAddTaskModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenManualAddTaskModal();
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
                    title="Buka form input tabel lengkap"
                  >
                    Buka Form Tabel Lengkap
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={!manualTitle.trim()}
                  className={`px-5 py-2 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md flex items-center gap-2 transition cursor-pointer ${
                    manualTitle.trim()
                      ? 'bg-teal-600 hover:bg-teal-500 shadow-teal-600/30 active:scale-[0.98]'
                      : 'bg-slate-400 dark:bg-slate-700 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambahkan ke Planning Hari Ini</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
