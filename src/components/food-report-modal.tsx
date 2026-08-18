import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Utensils, Calendar as CalendarIcon, FileText, CheckCircle2, X, Clock, CheckSquare, Square } from 'lucide-react';
import { Button, Input, Textarea } from './ui';
import { toast } from 'sonner';

interface FoodReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userNik: string;
  userName: string;
  userDept: string;
}

export function FoodReportModal({ isOpen, onClose, userNik, userName, userDept }: FoodReportModalProps) {
  const [reportDate, setReportDate] = useState('');
  const [shift, setShift] = useState<'Siang' | 'Malam' | 'Longshift'>('Siang');
  const [selectedMeals, setSelectedMeals] = useState<string[]>(['Siang']);
  const [status, setStatus] = useState<'Pesan Makan' | 'Batal Makan'>('Pesan Makan');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mealOptions = ['Pagi', 'Siang', 'Sore', 'Malam'];

  const toggleMeal = (meal: string) => {
    setSelectedMeals(prev => 
      prev.includes(meal) 
        ? prev.filter(m => m !== meal)
        : [...prev, meal]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDate) return toast.error('Harap pilih tanggal pelaporan');
    if (selectedMeals.length === 0 && status === 'Pesan Makan') return toast.error('Harap pilih minimal satu waktu makan');

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/meal-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nik: userNik,
          name: userName,
          department: userDept,
          reportDate,
          shift,
          meals: JSON.stringify(selectedMeals),
          status,
          notes,
        }),
      });

      if (!response.ok) throw new Error('Gagal mengirim laporan');

      toast.success('Status makan berhasil dilaporkan ke tim Administrasi');
      onClose();
    } catch (error) {
      toast.error('Gagal melaporkan status makan');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
      >
        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Pelaporan Status Makan</h2>
              <p className="text-sm text-slate-500">Aktivasi pesanan konsumsi harian</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-5">
            {/* Tanggal */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Tanggal Kehadiran / Pelaporan</label>
              <div className="relative">
                <Input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="pl-10 h-11 bg-slate-50 border-slate-200"
                  required
                />
                <CalendarIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Shift */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Shift Kerja Hari Ini</label>
              <div className="grid grid-cols-3 gap-2">
                {['Siang', 'Malam', 'Longshift'].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setShift(s as any)}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg border text-sm font-medium transition-all ${
                      shift === s
                        ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Pesanan */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Status Pesanan Makan</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setStatus('Pesan Makan')}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    status === 'Pesan Makan'
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:border-slate-200'
                  }`}
                >
                  <CheckCircle2 className={`w-5 h-5 ${status === 'Pesan Makan' ? 'text-orange-500' : 'text-slate-400'}`} />
                  <span className="font-semibold text-sm">Aktivasi Pesanan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('Batal Makan')}
                  className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    status === 'Batal Makan'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:border-slate-200'
                  }`}
                >
                  <X className={`w-5 h-5 ${status === 'Batal Makan' ? 'text-red-500' : 'text-slate-400'}`} />
                  <span className="font-semibold text-sm">Batalkan Pesanan</span>
                </button>
              </div>
            </div>

            {/* Pilihan Waktu Makan */}
            <div className={`transition-opacity duration-200 ${status === 'Batal Makan' ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Pilih Waktu Konsumsi yang Diaktifkan</label>
              <div className="grid grid-cols-2 gap-2">
                {mealOptions.map(meal => {
                  const isSelected = selectedMeals.includes(meal);
                  return (
                    <button
                      key={meal}
                      type="button"
                      onClick={() => toggleMeal(meal)}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50 text-orange-800'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-orange-500 shrink-0" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-400 shrink-0" />
                      )}
                      <span className="font-medium text-sm">Makan {meal}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Catatan */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
              <div className="relative">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Misal: Saya masuk hari ini setelah izin sakit kemarin..."
                  className="pl-10 resize-none h-20 bg-slate-50 border-slate-200"
                />
                <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-6 mt-6 border-t border-slate-100 sticky bottom-0 bg-white">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1 h-11"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-11 bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-200"
            >
              {isSubmitting ? 'Mengirim...' : 'Kirim Laporan'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
