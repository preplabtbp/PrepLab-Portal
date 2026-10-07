import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

interface AddAttendanceEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
  inspectorNik: string;
  defaultCategory?: string;
  onSuccess: (updatedEmployee: any) => void;
}

const CATEGORIES = [
  { id: 'tanggalIzin', label: 'Tanggal Izin', group: 'date', color: 'teal' },
  { id: 'tanggalIzinKhusus', label: 'Tanggal Izin Khusus', group: 'date', color: 'indigo' },
  { id: 'tanggalSakitSite', label: 'Tanggal Sakit Site (SS)', group: 'date', color: 'amber' },
  { id: 'tanggalSakitLuar', label: 'Tanggal Sakit Luar (SL)', group: 'date', color: 'orange' },
  { id: 'tanggalAlpa', label: 'Tanggal Alpa', group: 'date', color: 'rose' },
  { id: 'alasanIzin', label: 'Alasan Izin', group: 'reason', color: 'teal' },
  { id: 'alasanIzinKhusus', label: 'Alasan Izin Khusus', group: 'reason', color: 'indigo' },
  { id: 'alasanSakitSite', label: 'Alasan Sakit Site (SS)', group: 'reason', color: 'amber' },
  { id: 'alasanSakitLuar', label: 'Alasan Sakit Luar (SL)', group: 'reason', color: 'orange' }
];

export function AddAttendanceEntryModal({
  isOpen,
  onClose,
  employee,
  inspectorNik,
  defaultCategory = 'tanggalIzin',
  onSuccess
}: AddAttendanceEntryModalProps) {
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory);
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen && defaultCategory) {
      setSelectedCategory(defaultCategory);
    }
  }, [isOpen, defaultCategory]);

  if (!isOpen || !employee) return null;

  const activeCategoryObj = CATEGORIES.find(c => c.id === selectedCategory) || CATEGORIES[0];
  const isDateCategory = activeCategoryObj.group === 'date';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) {
      toast.error('Isi catatan atau tanggal tidak boleh kosong.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/employees/${employee.nik}/attendance-entry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-nik': inspectorNik
        },
        body: JSON.stringify({
          category: selectedCategory,
          value: inputValue.trim(),
          year: 2026,
          editorNik: inspectorNik
        })
      });

      const data = await res.json();
      if (!res.ok || data.status === 'error') {
        throw new Error(data.message || 'Gagal menambahkan catatan');
      }

      toast.success(`${activeCategoryObj.label} berhasil ditambahkan!`, {
        description: `Tersimpan untuk ${employee.name}`
      });

      if (data.data) {
        onSuccess(data.data);
      }
      setInputValue('');
      onClose();
    } catch (err: any) {
      toast.error('Gagal menambahkan: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickPreset = (preset: string) => {
    setInputValue(prev => prev ? `${prev}\n${preset}` : preset);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-teal-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#22a7b8] text-white flex items-center justify-center shadow-md">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">
                Tambah Catatan Absensi
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {employee.name} • 2026
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Category Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Pilih Kategori Kolom
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#22a7b8] bg-white cursor-pointer shadow-xs"
            >
              <optgroup label="📅 Kolom Tanggal Absensi">
                <option value="tanggalIzin">Tanggal Izin</option>
                <option value="tanggalIzinKhusus">Tanggal Izin Khusus</option>
                <option value="tanggalSakitSite">Tanggal Sakit Site (SS)</option>
                <option value="tanggalSakitLuar">Tanggal Sakit Luar (SL)</option>
                <option value="tanggalAlpa">Tanggal Alpa</option>
              </optgroup>
              <optgroup label="📝 Kolom Alasan Absensi">
                <option value="alasanIzin">Alasan Izin</option>
                <option value="alasanIzinKhusus">Alasan Izin Khusus</option>
                <option value="alasanSakitSite">Alasan Sakit Site (SS)</option>
                <option value="alasanSakitLuar">Alasan Sakit Luar (SL)</option>
              </optgroup>
            </select>
          </div>

          {/* Input Area */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>{isDateCategory ? 'Rincian Tanggal' : 'Catatan Alasan'}</span>
              <span className="text-[10px] text-slate-400 font-normal">Bisa multi-baris</span>
            </label>
            <textarea
              rows={4}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                isDateCategory
                  ? 'Contoh: 15-Agu-2026\n16-Agu-2026'
                  : 'Contoh: 15-Aug-26 s/d 17-Aug-26 (3 Hari) - Acara Keluarga'
              }
              className="w-full p-3 rounded-2xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#22a7b8] shadow-xs"
              required
              autoFocus
            />
          </div>

          {/* Quick Helper Presets */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
            <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#22a7b8]" />
              <span>Format Rekomendasi:</span>
            </p>
            <p className="text-[10px] text-slate-500 leading-relaxed font-mono">
              {isDateCategory ? 'Format tanggal: DD-Mmm-YYYY (contoh: 15-Agu-2026)' : 'Format alasan: [Tgl s/d Tgl] (N Hari) - [Keterangan]'}
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#22a7b8] hover:bg-[#1b8f9e] transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Menyimpan...' : 'Tambahkan'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
