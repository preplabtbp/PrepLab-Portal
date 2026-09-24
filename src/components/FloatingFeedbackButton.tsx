import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lightbulb, Bug, MessageSquarePlus, X, Send, Sparkles, 
  Image as ImageIcon, ExternalLink, Loader2, CheckCircle2 
} from 'lucide-react';
import { toast } from 'sonner';
import { uploadPhotoToDrive } from '../sheets-api';
import { triggerExpGain } from '../lib/gamificationEvents';

interface FloatingFeedbackButtonProps {
  inspectorNik: string | null;
  inspectorName: string | null;
  userProfile?: any;
  isHome?: boolean;
  isBulletin?: boolean;
  isBulletinFocusMode?: boolean;
  isCrewRole?: boolean;
  currentPath?: string;
  onNavigate: (path: string) => void;
}

const MODULE_OPTIONS = [
  'Umum / Portal',
  'Buletin & Pengumuman',
  'Roster & Cuti',
  'Inspeksi Harian (P2H)',
  'P5M Schedule',
  'Work Orders & Downtime',
  'Sistem APD',
  'Quotes Motivasi',
  'Database Karyawan',
  'Cloud Storage',
  'Quiz & Edukasi',
  'Induksi Internal',
  'Lainnya'
];

export function FloatingFeedbackButton({
  inspectorNik,
  inspectorName,
  userProfile,
  isHome = false,
  isBulletin = false,
  isBulletinFocusMode = false,
  isCrewRole = false,
  currentPath = '',
  onNavigate
}: FloatingFeedbackButtonProps) {
  // Hide on feedback support page itself to avoid redundancy
  if (currentPath === '/feedback-support') {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<'suggestion' | 'bug' | 'improvement' | 'question'>('suggestion');
  const [module, setModule] = useState(() => {
    if (currentPath.startsWith('/bulletin')) return 'Buletin & Pengumuman';
    if (currentPath.startsWith('/inspect') || currentPath.startsWith('/weekly-inspection')) return 'Inspeksi Harian (P2H)';
    if (currentPath.startsWith('/p5m')) return 'P5M Schedule';
    if (currentPath.startsWith('/wo') || currentPath.startsWith('/create-wo')) return 'Work Orders & Downtime';
    if (currentPath.startsWith('/apd')) return 'Sistem APD';
    if (currentPath.startsWith('/quiz')) return 'Quiz & Edukasi';
    if (currentPath.startsWith('/preplab-cloud')) return 'Cloud Storage';
    return 'Umum / Portal';
  });
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Position calculation: avoids mobile bottom nav & desktop right rail
  const hasMobileBottomNav = !isCrewRole && !(isBulletin && isBulletinFocusMode);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran gambar maksimal 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Silakan isi saran, ide, atau kendala Anda');
      return;
    }

    if (!inspectorNik) {
      toast.error('Silakan login terlebih dahulu untuk mengirim masukan');
      return;
    }

    setSubmitting(true);
    try {
      let finalScreenshotUrl = null;
      if (screenshotBase64) {
        try {
          toast.loading('Mengunggah tangkapan layar...', { id: 'upload-ss' });
          finalScreenshotUrl = await uploadPhotoToDrive(
            screenshotBase64,
            'image/jpeg',
            `Feedback_${inspectorNik}_${Date.now()}.jpg`,
            'Bug Reports & Feedback'
          );
          toast.dismiss('upload-ss');
        } catch (uploadErr) {
          console.warn('Drive upload fallback:', uploadErr);
          finalScreenshotUrl = screenshotBase64;
        }
      }

      const generatedTitle = title.trim() || description.trim().split('\n')[0].slice(0, 60);

      const payload = {
        type,
        category: type === 'bug' ? 'Laporan Bug' : type === 'suggestion' ? 'Saran Fitur' : type === 'improvement' ? 'Peningkatan' : 'Pertanyaan',
        module,
        priority: type === 'bug' ? 'high' : 'medium',
        title: generatedTitle,
        description: description.trim(),
        screenshotUrl: finalScreenshotUrl,
        authorNik: inspectorNik,
        authorName: inspectorName || userProfile?.nama || 'Personil PrepLab',
        authorRole: userProfile?.jabatan || 'Staff',
        authorSection: userProfile?.section || 'Prep & Lab'
      };

      const res = await fetch('/api/feedbacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (json.status !== 'success') {
        throw new Error(json.message || 'Gagal mengirim masukan');
      }

      toast.success('Terima kasih! Masukan Anda berhasil terkirim ke Developer 🎉');
      triggerExpGain(100, 'Ide / Masukan Terkirim!', 'Kontribusi saran & masukan PrepLab');
      window.dispatchEvent(new Event('gamification_updated'));

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setIsOpen(false);
        setTitle('');
        setDescription('');
        setScreenshotBase64(null);
      }, 1800);
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan saat mengirim masukan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Action Pill Button */}
      <aside 
        aria-label="Tombol Masukan dan Saran"
        className={`fixed z-40 transition-all duration-300 pointer-events-auto ${
          hasMobileBottomNav 
            ? 'bottom-[5.25rem] right-3.5 sm:right-4' 
            : 'bottom-4 right-3.5 sm:right-4'
        } ${isHome ? 'md:right-28 md:bottom-6' : 'md:right-6 md:bottom-6'}`}
      >
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-700 hover:from-teal-500 hover:to-emerald-600 text-white shadow-lg shadow-teal-900/30 hover:shadow-xl hover:shadow-teal-600/35 border border-teal-400/40 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer select-none"
          title="Kirim Masukan, Ide, atau Laporkan Kendala (+100 EXP)"
        >
          {/* Subtle pulse aura */}
          <span className="absolute -inset-0.5 rounded-full bg-teal-400 opacity-20 blur-xs group-hover:opacity-40 transition-opacity" />

          {/* Icon */}
          <div className="relative flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform duration-300" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          </div>

          {/* Text Labels: Compact on mobile, descriptive on desktop */}
          <div className="relative flex items-center gap-1.5 font-medium leading-none">
            <span className="text-xs font-bold tracking-tight">
              <span className="inline sm:hidden">Saran</span>
              <span className="hidden sm:inline">Masukan &amp; Saran</span>
            </span>
            <span className="hidden sm:inline-block px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-mono font-bold border border-amber-300/30">
              +100 EXP
            </span>
          </div>
        </button>
      </aside>

      {/* Quick Feedback Modal Dialog */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Modal Dialog Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden z-10 transition-colors my-auto"
              style={{
                backgroundColor: 'var(--card-bg, #1e293b)',
                borderColor: 'var(--border-main, rgba(148, 163, 184, 0.25))',
                color: 'var(--text-main, #f8fafc)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div 
                className="px-5 py-4 border-b flex items-center justify-between"
                style={{ borderColor: 'var(--border-main, rgba(148, 163, 184, 0.15))' }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base leading-tight">
                      Kirim Masukan &amp; Saran
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Bantu kami menyempurnakan PrepLab Portal
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={submitting}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white cursor-pointer"
                  title="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Success Notification View */}
              {isSuccess ? (
                <div className="p-8 text-center flex flex-col items-center justify-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 animate-bounce">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-base text-emerald-400">
                    Masukan Berhasil Terkirim!
                  </h4>
                  <p className="text-xs text-slate-300 max-w-xs">
                    Terima kasih atas kontribusi Anda. Poin <strong>+100 EXP</strong> telah ditambahkan ke profil Anda.
                  </p>
                </div>
              ) : (
                /* Main Form */
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                  {/* Category Type Pills */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2">
                      Kategori Masukan:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {(
                        [
                          { key: 'suggestion', label: 'Saran Fitur', icon: Lightbulb, color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
                          { key: 'bug', label: 'Kendala / Bug', icon: Bug, color: 'text-rose-400 border-rose-500/40 bg-rose-500/10' },
                          { key: 'improvement', label: 'Peningkatan', icon: Sparkles, color: 'text-sky-400 border-sky-500/40 bg-sky-500/10' },
                          { key: 'question', label: 'Pertanyaan', icon: MessageSquarePlus, color: 'text-teal-400 border-teal-500/40 bg-teal-500/10' }
                        ] as const
                      ).map((item) => {
                        const isSelected = type === item.key;
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setType(item.key)}
                            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                              isSelected
                                ? `${item.color} shadow-xs font-bold scale-[1.02] ring-1 ring-teal-400/30`
                                : 'border-slate-700/60 bg-slate-800/40 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Target Module Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                      Modul Terkait:
                    </label>
                    <select
                      value={module}
                      onChange={(e) => setModule(e.target.value)}
                      className="w-full text-xs rounded-xl px-3 py-2 border outline-none focus:border-teal-500 transition-colors"
                      style={{
                        backgroundColor: 'var(--input-bg, rgba(0, 0, 0, 0.25))',
                        borderColor: 'var(--border-main, rgba(148, 163, 184, 0.25))',
                        color: 'var(--text-main, #f8fafc)'
                      }}
                    >
                      {MODULE_OPTIONS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Title (Optional) */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                      Judul Ringkas <span className="opacity-60 font-normal">(opsional)</span>:
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Contoh: Tombol simpan laporan KTA terlalu kecil"
                      className="w-full text-xs rounded-xl px-3 py-2 border outline-none focus:border-teal-500 transition-colors"
                      style={{
                        backgroundColor: 'var(--input-bg, rgba(0, 0, 0, 0.25))',
                        borderColor: 'var(--border-main, rgba(148, 163, 184, 0.25))',
                        color: 'var(--text-main, #f8fafc)'
                      }}
                    />
                  </div>

                  {/* Description Textarea */}
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                      Deskripsi Masukan / Kendala: <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Jelaskan kendala, ide perbaikan, atau masukan yang Anda harapkan..."
                      required
                      className="w-full text-xs rounded-xl p-3 border outline-none focus:border-teal-500 transition-colors resize-none"
                      style={{
                        backgroundColor: 'var(--input-bg, rgba(0, 0, 0, 0.25))',
                        borderColor: 'var(--border-main, rgba(148, 163, 184, 0.25))',
                        color: 'var(--text-main, #f8fafc)'
                      }}
                    />
                  </div>

                  {/* Screenshot Attachment (Optional) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-[var(--text-muted)] flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Lampiran Gambar / Screenshot <span className="opacity-60 font-normal">(opsional)</span>:</span>
                      </label>
                      {screenshotBase64 && (
                        <button
                          type="button"
                          onClick={() => setScreenshotBase64(null)}
                          className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                        >
                          Hapus Gambar
                        </button>
                      )}
                    </div>
                    {screenshotBase64 ? (
                      <div className="relative w-full h-24 rounded-xl overflow-hidden border border-teal-500/40">
                        <img 
                          src={screenshotBase64} 
                          alt="Screenshot Lampiran" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                    ) : (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-500/20 file:text-teal-300 hover:file:bg-teal-500/30 cursor-pointer"
                      />
                    )}
                  </div>

                  {/* Modal Footer & Buttons */}
                  <div 
                    className="pt-3 border-t flex flex-wrap items-center justify-between gap-2"
                    style={{ borderColor: 'var(--border-main, rgba(148, 163, 184, 0.15))' }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onNavigate('/feedback-support');
                      }}
                      className="text-xs text-teal-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                      title="Buka Halaman Lengkap Feedback & Support"
                    >
                      <span>Lihat Riwayat Laporan</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>

                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        disabled={submitting}
                        className="px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={submitting || !description.trim()}
                        className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold shadow-md shadow-teal-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Mengirim...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Kirim Masukan</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
