import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lightbulb, Bug, MessageSquarePlus, X, Send, Sparkles, 
  Image as ImageIcon, ExternalLink, Loader2, CheckCircle2,
  Camera, Clipboard, Trash2, RefreshCw
} from 'lucide-react';
import { toJpeg } from 'html-to-image';
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
  'Labnote & Pengumuman',
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
  // Hide on feedback support page itself to avoid redundancy, or completely hide for crew roles
  const jab = (userProfile?.jabatan || localStorage.getItem('p2h_inspector_jabatan') || '').toLowerCase();
  const role = (userProfile?.role || '').toLowerCase();
  const isDev = localStorage.getItem('p2h_is_developer') === 'true';
  const isCrew = isCrewRole || (!isDev && (
    jab.includes('crew') || jab.includes('operator') || jab.includes('helper') || jab.includes('teknisi') || role.includes('crew')
  ) && !jab.includes('spv') && !jab.includes('supervisor') && !jab.includes('foreman') && !jab.includes('officer') &&
    !jab.includes('analyst') && !jab.includes('superintendent') && !jab.includes('manager') && !jab.includes('admin'));

  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<'suggestion' | 'bug' | 'improvement' | 'question'>('suggestion');
  const [module, setModule] = useState(() => {
    if (currentPath.startsWith('/bulletin')) return 'Labnote & Pengumuman';
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
  const [capturingScreen, setCapturingScreen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tangani penempelan (Ctrl+V) gambar dari clipboard ketika modal masukan terbuka
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            const reader = new FileReader();
            reader.onload = () => {
              setScreenshotBase64(reader.result as string);
              toast.success('Screenshot berhasil ditempel (Ctrl+V) dari clipboard! 📋');
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    };

    const handleCustomPasted = (e: any) => {
      if (e.detail?.base64) {
        setScreenshotBase64(e.detail.base64);
      }
    };

    window.addEventListener('paste', handlePaste);
    window.addEventListener('portal:image_pasted', handleCustomPasted);
    return () => {
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('portal:image_pasted', handleCustomPasted);
    };
  }, [isOpen]);

  // Ambil tangkapan layar tampilan portal yang sedang diakses secara otomatis
  const handleCaptureScreen = async () => {
    setCapturingScreen(true);
    const toastId = toast.loading('Mengambil tangkapan layar tampilan portal...');
    const modalEl = document.querySelector('.feedback-modal-container') as HTMLElement;
    const backdropEl = document.querySelector('.feedback-modal-backdrop') as HTMLElement;
    try {
      if (modalEl) modalEl.style.display = 'none';
      if (backdropEl) backdropEl.style.display = 'none';

      // Jeda sejenak agar browser merender penghilangan modal sepenuhnya
      await new Promise(r => setTimeout(r, 80));

      const targetEl = document.getElementById('root') || document.body;
      
      let dataUrl: string = '';
      try {
        dataUrl = await toJpeg(targetEl, {
          quality: 0.85,
          skipFonts: true,
          cacheBust: false,
          pixelRatio: Math.min(window.devicePixelRatio || 1, 1.25),
          filter: (node: any) => {
            if (!node || !node.tagName) return true;
            if (node.hasAttribute?.('data-html2canvas-ignore')) return false;
            if (node.classList?.contains('feedback-modal-container') ||
                node.classList?.contains('feedback-modal-backdrop') ||
                node.classList?.contains('feedback-ignore-capture')) {
              return false;
            }
            return true;
          }
        });
      } catch (domCaptureErr) {
        console.warn('html-to-image error, attempting displayMedia fallback:', domCaptureErr);
        if (navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
          const stream = await navigator.mediaDevices.getDisplayMedia({
            video: { displaySurface: 'browser' } as any,
            audio: false
          });
          const video = document.createElement('video');
          video.srcObject = stream;
          await video.play();
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          stream.getTracks().forEach(t => t.stop());
          dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        } else {
          throw domCaptureErr;
        }
      }

      setScreenshotBase64(dataUrl);
      toast.success('Tampilan portal yang sedang diakses berhasil dilampirkan! 📸', { id: toastId });
    } catch (err: any) {
      console.error('Failed to capture screen:', err);
      toast.error('Gagal mengambil screenshot otomatis. Silakan gunakan tombol PrtSc / Snipping Tool lalu tekan Ctrl + V.', { id: toastId });
    } finally {
      if (modalEl) modalEl.style.display = '';
      if (backdropEl) backdropEl.style.display = '';
      setCapturingScreen(false);
    }
  };

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

  if (currentPath === '/feedback-support' || isCrew) {
    return null;
  }

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
              data-html2canvas-ignore="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setIsOpen(false)}
              className="feedback-modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Modal Dialog Card */}
            <motion.div
              data-html2canvas-ignore="true"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="feedback-modal-container relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden z-10 my-auto text-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 leading-tight">
                      Kirim Masukan &amp; Saran
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-normal">
                      Bantu kami menyempurnakan PrepLab Portal
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={submitting}
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-800 cursor-pointer"
                  title="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Success Notification View */}
              {isSuccess ? (
                <div className="p-8 text-center flex flex-col items-center justify-center space-y-3 bg-white">
                  <div className="w-14 h-14 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 animate-bounce">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-base text-slate-900">
                    Masukan Berhasil Terkirim!
                  </h4>
                  <p className="text-xs text-slate-600 max-w-xs">
                    Terima kasih atas kontribusi Anda. Poin <strong className="text-teal-700 font-bold">+100 EXP</strong> telah ditambahkan ke profil Anda.
                  </p>
                </div>
              ) : (
                /* Main Form */
                <form onSubmit={handleSubmit} className="p-5 space-y-4 bg-white text-slate-900">
                  {/* Category Type Pills - Strict 3 Colors (Slate / Teal / Black) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-2">
                      Kategori Masukan:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(
                        [
                          { key: 'suggestion', label: 'Saran Fitur', icon: Lightbulb },
                          { key: 'bug', label: 'Kendala / Bug', icon: Bug },
                          { key: 'improvement', label: 'Peningkatan', icon: Sparkles },
                          { key: 'question', label: 'Pertanyaan', icon: MessageSquarePlus }
                        ] as const
                      ).map((item) => {
                        const isSelected = type === item.key;
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setType(item.key)}
                            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-teal-50 border-2 border-teal-600 text-teal-950 font-bold shadow-xs'
                                : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold'
                            }`}
                          >
                            <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-teal-700' : 'text-slate-600'}`} />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Target Module Selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-1.5">
                      Modul Terkait:
                    </label>
                    <select
                      value={module}
                      onChange={(e) => setModule(e.target.value)}
                      className="w-full text-xs font-medium rounded-xl px-3 py-2.5 border border-slate-300 bg-white text-slate-900 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-colors shadow-2xs"
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
                    <label className="block text-xs font-bold text-slate-900 mb-1.5">
                      Judul Ringkas <span className="text-slate-500 font-normal">(opsional)</span>:
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Contoh: Tombol simpan laporan KTA terlalu kecil"
                      className="w-full text-xs font-medium rounded-xl px-3 py-2.5 border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-colors shadow-2xs"
                    />
                  </div>

                  {/* Description Textarea */}
                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-1.5">
                      Deskripsi Masukan / Kendala: <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Jelaskan kendala, ide perbaikan, atau masukan yang Anda harapkan..."
                      required
                      className="w-full text-xs font-medium rounded-xl p-3 border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-colors resize-none leading-relaxed shadow-2xs"
                    />
                  </div>

                  {/* Screenshot Attachment with Auto Capture & Ctrl+V Paste */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-teal-700" />
                        <span>Lampiran Screenshot Layar <span className="text-slate-500 font-normal">(opsional)</span>:</span>
                      </label>
                      {screenshotBase64 && (
                        <button
                          type="button"
                          onClick={() => setScreenshotBase64(null)}
                          className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold hover:underline cursor-pointer"
                        >
                          Hapus Gambar
                        </button>
                      )}
                    </div>

                    {screenshotBase64 ? (
                      <div className="relative w-full rounded-2xl overflow-hidden border border-teal-300 bg-teal-50/50 p-3 flex items-center gap-3 shadow-2xs">
                        <img 
                          src={screenshotBase64} 
                          alt="Screenshot Lampiran" 
                          className="w-24 h-16 object-cover rounded-xl border border-teal-200 shrink-0 shadow-xs" 
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-teal-950 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-700" />
                            <span>Tangkapan Layar Terlampir</span>
                          </p>
                          <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-1">
                            Akan otomatis terkirim bersama saran ke Developer
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <button
                              type="button"
                              onClick={handleCaptureScreen}
                              disabled={capturingScreen}
                              className="text-[11px] font-bold text-teal-700 hover:text-teal-800 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Camera className="w-3 h-3" /> Tangkap Ulang Layar
                            </button>
                            <span className="text-slate-300">•</span>
                            <button
                              type="button"
                              onClick={() => setScreenshotBase64(null)}
                              className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* 1-Click Tangkap Tampilan Layar Portal yang Sedang Diakses */}
                        <button
                          type="button"
                          onClick={handleCaptureScreen}
                          disabled={capturingScreen}
                          className="w-full py-2.5 px-4 rounded-xl border border-teal-300 bg-teal-50 hover:bg-teal-100 active:scale-[0.99] text-teal-950 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                          title="Ambil tangkapan layar tampilan portal yang sedang aktif di belakang jendela ini"
                        >
                          {capturingScreen ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
                              <span>Sedang mengambil tampilan layar portal...</span>
                            </>
                          ) : (
                            <>
                              <Camera className="w-4 h-4 text-teal-700" />
                              <span>📸 Tangkap Tampilan Layar Portal Saat Ini</span>
                            </>
                          )}
                        </button>

                        {/* Dropzone & Paste (Ctrl+V) Area */}
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="p-3.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-teal-50/40 hover:border-teal-400 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-200 group-hover:scale-105 transition-transform">
                              <Clipboard className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 text-left">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                Atau tekan <kbd className="text-teal-950 font-mono bg-white px-1.5 py-0.5 rounded border border-slate-300 font-bold shadow-2xs text-[11px]">Ctrl + V</kbd> untuk tempel gambar
                              </p>
                              <p className="text-[11px] text-slate-600 mt-0.5">
                                Bisa juga klik di sini untuk memilih file (PNG, JPG)
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-slate-800 shrink-0 px-3 py-1.5 bg-white rounded-lg border border-slate-300 group-hover:border-teal-400 group-hover:text-teal-800 transition-colors shadow-2xs">
                            Pilih File
                          </span>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Modal Footer & Buttons */}
                  <div className="pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onNavigate('/feedback-support');
                      }}
                      className="text-xs text-slate-700 hover:text-teal-700 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                      title="Buka Halaman Lengkap Feedback & Support"
                    >
                      <span>Lihat Riwayat Laporan</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        disabled={submitting}
                        className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={submitting || !description.trim()}
                        className="px-4.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
