import React, { useState } from 'react';
import { 
  X, Calendar, CalendarRange, Download, RefreshCw, 
  CheckCircle2, AlertTriangle, FileSpreadsheet, Filter, 
  Layers, Clock, ArrowRight, Sparkles, Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface TimeRangeFetchModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspectorNik: string;
  employees: any[];
  onSuccess: () => Promise<void>;
  isSectionManager: boolean;
}

export function TimeRangeFetchModal({
  isOpen,
  onClose,
  inspectorNik,
  employees,
  onSuccess,
  isSectionManager
}: TimeRangeFetchModalProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const todayStr = now.toISOString().split('T')[0];
  const firstDayThisMonth = `${currentYear}-${currentMonth}-01`;

  const [startDate, setStartDate] = useState(firstDayThisMonth);
  const [endDate, setEndDate] = useState(todayStr);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'attendance' | 'spdk' | 'manpower'>('all');
  const [selectedPt, setSelectedPt] = useState<'ALL' | 'TBP' | 'GTS'>('ALL');
  const [isFetching, setIsFetching] = useState(false);
  const [fetchSuccess, setFetchSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  // Preset Handlers
  const handlePreset = (type: 'thisMonth' | 'lastMonth' | 'last30' | 'thisQuarter' | 'thisYear') => {
    const d = new Date();
    if (type === 'thisMonth') {
      setStartDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
      setEndDate(d.toISOString().split('T')[0]);
    } else if (type === 'lastMonth') {
      const prevMonthDate = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const lastDayPrevMonth = new Date(d.getFullYear(), d.getMonth(), 0);
      setStartDate(prevMonthDate.toISOString().split('T')[0]);
      setEndDate(lastDayPrevMonth.toISOString().split('T')[0]);
    } else if (type === 'last30') {
      const past30 = new Date(d.getTime() - (30 * 24 * 60 * 60 * 1000));
      setStartDate(past30.toISOString().split('T')[0]);
      setEndDate(d.toISOString().split('T')[0]);
    } else if (type === 'thisQuarter') {
      const currentQ = Math.floor(d.getMonth() / 3);
      const startQ = new Date(d.getFullYear(), currentQ * 3, 1);
      setStartDate(startQ.toISOString().split('T')[0]);
      setEndDate(d.toISOString().split('T')[0]);
    } else if (type === 'thisYear') {
      setStartDate(`${d.getFullYear()}-01-01`);
      setEndDate(`${d.getFullYear()}-12-31`);
    }
  };

  // Calculate day difference
  const calculateDays = () => {
    try {
      const s = new Date(startDate);
      const e = new Date(endDate);
      const diffTime = Math.abs(e.getTime() - s.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return isNaN(diffDays) ? 0 : diffDays;
    } catch {
      return 0;
    }
  };

  // Live Fetch & Sync Data with backend
  const handleFetchData = async () => {
    if (!startDate || !endDate) {
      toast.error('Silakan tentukan rentang tanggal awal dan akhir.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Tanggal mulai tidak boleh lebih besar dari tanggal selesai.');
      return;
    }

    setIsFetching(true);
    setFetchSuccess(null);

    try {
      const res = await fetch('/api/roster/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-nik': inspectorNik
        },
        body: JSON.stringify({
          editorNik: inspectorNik,
          startDate,
          endDate,
          category: selectedCategory,
          pt: selectedPt
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFetchSuccess(`Data periode ${startDate} s/d ${endDate} berhasil ditarik dan disinkronkan!`);
        toast.success(`Penarikan data periode berhasil (${calculateDays()} hari)!`);
        await onSuccess();
      } else {
        throw new Error(data.message || 'Gagal menarik data dari server');
      }
    } catch (err: any) {
      toast.error('Penarikan data gagal: ' + err.message);
    } finally {
      setIsFetching(false);
    }
  };

  // Export filtered dataset to CSV
  const handleExportCsv = () => {
    try {
      const isGtsEmp = (e: any) => {
        const ptStr = (e.pt || '').toString().trim().toUpperCase();
        const nikStr = (e.nik || '').toString().trim().toUpperCase();
        const secStr = (e.section || '').toString().trim().toUpperCase();
        return ptStr === 'GTS' || nikStr.startsWith('03') || nikStr.startsWith('M03') || secStr.includes('GTS');
      };

      let filtered = employees;
      if (selectedPt === 'GTS') filtered = filtered.filter(e => isGtsEmp(e));
      else if (selectedPt === 'TBP') filtered = filtered.filter(e => !isGtsEmp(e));

      const rows: string[][] = [
        ['NIK', 'Nama Karyawan', 'Perusahaan', 'Jabatan', 'Section', 'Department', 'Status Karyawan', 'Status Kontrak', 'Periode Awal', 'Periode Akhir']
      ];

      filtered.forEach(emp => {
        rows.push([
          `"${emp.nik || ''}"`,
          `"${emp.name || ''}"`,
          `"${emp.pt || (isGtsEmp(emp) ? 'GTS' : 'TBP')}"`,
          `"${emp.jabatan || ''}"`,
          `"${emp.section || ''}"`,
          `"${emp.department || ''}"`,
          `"${emp.statusKaryawan || 'Active'}"`,
          `"${emp.statusKontrak || ''}"`,
          `"${startDate}"`,
          `"${endDate}"`
        ]);
      });

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(e => e.join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Penarikan_Data_PrepLab_${startDate}_sd_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('File rekap periode berhasil diunduh!');
    } catch (err: any) {
      toast.error('Gagal mengekspor data: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col"
      >
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-[#135e69] via-[#1a7684] to-[#22a7b8] p-5 sm:p-6 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/30 flex items-center justify-center backdrop-blur-md text-white shadow-inner">
                <CalendarRange className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>Penarikan Data Time Range</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 border border-white/30 text-teal-100">
                    Periode Khusus
                  </span>
                </h3>
                <p className="text-xs text-teal-100/90 mt-0.5">
                  Tentukan rentang tanggal untuk menarik atau menyinkronkan data database &amp; absensi karyawan.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh] custom-scrollbar">
          {/* Quick Preset Chips */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#22a7b8]" />
              <span>Preset Rentang Cepat</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handlePreset('thisMonth')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-[#135e69] hover:border-teal-200 border border-slate-200 text-xs font-semibold text-slate-700 transition-all cursor-pointer"
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => handlePreset('lastMonth')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-[#135e69] hover:border-teal-200 border border-slate-200 text-xs font-semibold text-slate-700 transition-all cursor-pointer"
              >
                Bulan Lalu
              </button>
              <button
                type="button"
                onClick={() => handlePreset('last30')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-[#135e69] hover:border-teal-200 border border-slate-200 text-xs font-semibold text-slate-700 transition-all cursor-pointer"
              >
                30 Hari Terakhir
              </button>
              <button
                type="button"
                onClick={() => handlePreset('thisQuarter')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-[#135e69] hover:border-teal-200 border border-slate-200 text-xs font-semibold text-slate-700 transition-all cursor-pointer"
              >
                Kuartal Ini
              </button>
              <button
                type="button"
                onClick={() => handlePreset('thisYear')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-[#135e69] hover:border-teal-200 border border-slate-200 text-xs font-semibold text-slate-700 transition-all cursor-pointer"
              >
                Tahun 2026 Full
              </button>
            </div>
          </div>

          {/* Date Range Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#135e69]" />
                <span>Tanggal Mulai (From)</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#135e69]" />
                <span>Tanggal Selesai (To)</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
              />
            </div>

            <div className="col-span-1 sm:col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Total Rentang Waktu:</span>
              <span className="font-bold font-mono text-[#135e69] bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                {calculateDays()} Hari Kerja
              </span>
            </div>
          </div>

          {/* Scope PT & Kategori Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Pilihan Perusahaan */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Cakupan Perusahaan (PT)</span>
              </label>
              <select
                value={selectedPt}
                onChange={e => setSelectedPt(e.target.value as any)}
                className="w-full px-3.5 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
              >
                {isSectionManager && <option value="ALL">Semua PT (TBP, GPS, GTS)</option>}
                <option value="TBP">PT TBP &amp; GPS</option>
                <option value="GTS">PT GTS</option>
              </select>
            </div>

            {/* Pilihan Kategori Data */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-600" />
                <span>Kategori Data</span>
              </label>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value as any)}
                className="w-full px-3.5 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
              >
                <option value="all">Semua Data (Full Dataset)</option>
                <option value="attendance">Rekap Absensi (Izin, Sakit, Alpa)</option>
                <option value="spdk">Sanksi Disiplin &amp; SPDK</option>
                <option value="manpower">Master Manpower &amp; Profil</option>
              </select>
            </div>
          </div>

          {fetchSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{fetchSuccess}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isFetching}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Ekspor CSV / Excel</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isFetching}
              className="px-4 py-2.5 rounded-xl bg-transparent hover:bg-slate-200/60 text-slate-600 text-xs font-bold transition-all cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleFetchData}
              disabled={isFetching}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#135e69] to-[#22a7b8] hover:from-[#0f4d56] hover:to-[#1a8997] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-60"
            >
              {isFetching ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menarik Data...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Tarik &amp; Sinkronkan Data</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
