import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, X, AlertTriangle, ExternalLink, Check, 
  Upload, Sparkles, Loader2, Image as ImageIcon, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { compressImage } from '../features/inspections/hooks/useInspection';
import { triggerExpGain } from '../lib/gamificationEvents';

const SAFETY_KTA_FORM_URL = 'https://docs.google.com/forms/d/1YMympG3aA-8l978aAlRJFSoi-SVQAKiS7KmJjNRfuBI/viewform?edit_requested=true';

interface SimplifiedKtaModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspectorNik: string | null;
  inspectorName: string | null;
  userSection?: string;
  onSuccess?: () => void;
}

export function SimplifiedKtaModal({
  isOpen,
  onClose,
  inspectorNik,
  inspectorName,
  userSection = 'Preparasi & Lab',
  onSuccess
}: SimplifiedKtaModalProps) {
  const [selectedType, setSelectedType] = useState<'KTA' | 'TTA' | 'BOTH'>('BOTH');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 8MB');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          setImageFile(file);
          const reader = new FileReader();
          reader.onload = () => setImagePreview(reader.result as string);
          reader.readAsDataURL(file);
          toast.success('Gambar berhasil ditempel!');
          break;
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!imagePreview && !imageFile) {
      toast.error('Silakan upload atau foto tangkapan layar bukti form KTA/TTA!');
      return;
    }

    setSubmitting(true);
    toast.loading('Mengunggah bukti laporan KTA/TTA...', { id: 'upload-kta' });

    try {
      let base64Data = imagePreview || '';
      if (imageFile) {
        base64Data = await compressImage(imageFile);
      }

      let uploadedUrl = base64Data;
      try {
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data,
            mimeType: 'image/jpeg',
            filename: `KTA_TTA_${inspectorNik || 'user'}_${Date.now()}.jpg`,
            folderName: 'Laporan KTA TTA Harita'
          })
        });
        if (upRes.ok) {
          const upJson = await upRes.json();
          if (upJson.url) uploadedUrl = upJson.url;
        }
      } catch {
        // fallback to base64
      }

      const typesToSubmit: ('KTA' | 'TTA')[] = 
        selectedType === 'BOTH' ? ['KTA', 'TTA'] : [selectedType];

      const todayStr = new Date().toISOString().split('T')[0];

      for (const t of typesToSubmit) {
        await fetch('/api/kta-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nik: inspectorNik || 'USER',
            name: inspectorName || 'Personil',
            section: userSection,
            reportType: t,
            date: todayStr,
            imageUrl: uploadedUrl,
            description: description.trim() || `Laporan bukti formulir ${t} disederhanakan`,
            location: '-'
          })
        });
      }

      toast.success('✅ Bukti laporan KTA/TTA berhasil dikirim ke Safety!', { id: 'upload-kta', duration: 4000 });
      triggerExpGain(35, 'Laporan KTA/TTA Terkirim!', 'Kontribusi K3L Harita Nickel');
      window.dispatchEvent(new Event('gamification_updated'));
      window.dispatchEvent(new CustomEvent('refresh-group-reports'));

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Gagal mengirim: ' + (err.message || 'Terjadi kesalahan jaringan'), { id: 'upload-kta' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div 
        onPaste={handlePaste}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !submitting && onClose()}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="relative z-10 w-full sm:max-w-md rounded-t-[28px] sm:rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]"
          style={{
            backgroundColor: 'var(--card-bg, #FFFFFF)',
            borderColor: 'var(--border-main, #E2E8F0)'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-main)]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[var(--text-main)] font-display leading-tight">
                  Lapor Cepat KTA / TTA
                </h3>
                <p className="text-[10.5px] text-[var(--text-muted)]">
                  {inspectorName || 'Personil'} • +35 EXP
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-muted)] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-4 space-y-3.5 overflow-y-auto flex-1 text-xs">
            {/* Step 1: External Google Form Link */}
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-[var(--text-main)] block truncate">
                    1. Isi Formulir Safety K3L
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] block truncate">
                    Buka formulir online jika belum mengisi
                  </span>
                </div>
              </div>

              <a
                href={SAFETY_KTA_FORM_URL}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[11px] shrink-0 flex items-center gap-1 shadow-xs transition-all active:scale-95"
              >
                <span>Buka Form</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Step 2: Jenis Laporan */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                2. Pilih Jenis Observasi yang Dilaporkan:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'BOTH', label: '1 KTA & 1 TTA', sub: 'Standar Mingguan' },
                  { id: 'KTA', label: 'KTA Saja', sub: 'Kondisi Tdk Aman' },
                  { id: 'TTA', label: 'TTA Saja', sub: 'Tindakan Tdk Aman' }
                ].map(opt => {
                  const isSelected = selectedType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedType(opt.id as any)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30 font-bold'
                          : 'bg-[var(--input-bg)] border-[var(--border-main)] opacity-70 hover:opacity-100 font-medium'
                      }`}
                    >
                      <div className="text-[11px] leading-tight">{opt.label}</div>
                      <div className="text-[9px] text-[var(--text-muted)] mt-0.5">{opt.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Upload Screenshot / Photo */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                3. Unggah Tangkapan Layar / Foto Tanggapan Form:
              </label>

              {imagePreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-amber-500/40 bg-black/5 p-2">
                  <img src={imagePreview} alt="Bukti KTA" className="w-full max-h-48 object-contain rounded-xl" />
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setImageFile(null);
                    }}
                    className="absolute top-3 right-3 p-1.5 rounded-full bg-rose-500 text-white shadow-md hover:bg-rose-600 transition-colors"
                    title="Hapus foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-2xl border-2 border-dashed border-[var(--border-main)] hover:border-amber-500/50 p-4 text-center cursor-pointer transition-colors bg-[var(--input-bg)] hover:bg-amber-500/5"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-2">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-[var(--text-main)] block">
                    Pilih File Foto atau Ambil Kamera
                  </span>
                  <span className="text-[10.5px] text-[var(--text-muted)] mt-0.5 block">
                    Bisa juga tempel langsung (Ctrl+V)
                  </span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || (!imagePreview && !imageFile)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan Bukti...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Kirim Bukti KTA/TTA (+35 EXP)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
