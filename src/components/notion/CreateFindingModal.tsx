import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, AlertTriangle, Camera, Upload, Trash2, 
  MapPin, Calendar, User, Loader2, Image as ImageIcon, 
  PlusCircle, ShieldAlert, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { compressImage } from '../../features/inspections/hooks/useInspection';
import { EmployeeRosterSelect } from './EmployeeRosterSelect';

interface CreateFindingModalProps {
  isOpen: boolean;
  currentUserName?: string;
  currentUserNik?: string;
  defaultCategory?: string;
  employeesList?: any[];
  onClose: () => void;
  onCreated?: (newTicket: any) => void;
}

const COMMON_AREAS = [
  'Preparasi Basah (Area Kerja)',
  'Preparasi Basah (Office, Toilet, Loker)',
  'Preparasi Kering (Area Kerja)',
  'Preparasi Kering (Halte & Parkiran)',
  'Preparasi Kering (Dust Collector & Kompresor)',
  'Laboratorium (R. XRF, R. Chiller, R. UPS)',
  'Laboratorium (R. Fusion, R. Timbang, R. Scrubber)',
  'Laboratorium (R. Press, Koridor, Fasilitas Umum)',
  'Maintenance & Workshop',
  'Gudang Chemical',
  'Gudang Laboratorium',
  'Gudang Kontainer A',
  'Gudang Kontainer B',
  'Gudang Preparasi A & B',
  'Gudang Arsip',
  'Lainnya / Area Khusus'
];

export function CreateFindingModal({
  isOpen,
  currentUserName = '',
  currentUserNik = '',
  defaultCategory = 'Inspeksi Gabungan',
  employeesList,
  onClose,
  onCreated
}: CreateFindingModalProps) {
  const [category, setCategory] = useState<string>(defaultCategory);
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [location, setLocation] = useState<string>('Preparasi Basah (Area Kerja)');
  const [customLocation, setCustomLocation] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<string>('Medium');
  const [pic, setPic] = useState<string>('');
  const [selectedPicEmployee, setSelectedPicEmployee] = useState<any | null>(null);
  const [picValidationError, setPicValidationError] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPic('');
      setSelectedPicEmployee(null);
      setPicValidationError(null);
      setDescription('');
      setPhotoPreview(null);
      setPhotoFile(null);
      setLocation('Preparasi Basah (Area Kerja)');
      setCustomLocation('');
      setPriority('Medium');
      const d = new Date();
      setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
  }, [isOpen]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (file: File) => {
    if (!file) return;
    try {
      const compressedBase64 = await compressImage(file);
      setPhotoFile(file);
      setPhotoPreview(compressedBase64);
      toast.success("Foto temuan awal berhasil dimuat!");
    } catch {
      toast.error("Gagal memproses gambar foto temuan");
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          await handleFileChange(file);
          break;
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error("Wajib mengisi deskripsi temuan sidak!");
      return;
    }

    if (!pic.trim() || !selectedPicEmployee) {
      setPicValidationError("Wajib memilih PIC / Penanggung Jawab dari data karyawan di roster!");
      toast.error("PIC / Penanggung Jawab wajib dipilih dari data karyawan di roster!");
      return;
    }

    const effectiveLocation = location === 'Lainnya / Area Khusus' 
      ? (customLocation.trim() || 'Area Operasional Prep & Lab') 
      : location;

    setIsSubmitting(true);
    const loadingToast = toast.loading('Menyimpan temuan sidak management...', { id: 'create-finding' });

    try {
      let finalPhotoUrl = photoPreview || '-';

      // Upload file to server if file object is present
      if (photoFile && photoPreview?.startsWith('data:image')) {
        try {
          const upRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base64Data: photoPreview,
              mimeType: 'image/jpeg',
              filename: `TEMUAN_SIDAK_${Date.now()}.jpg`,
              folderName: 'Internal Tickets'
            })
          });
          if (upRes.ok) {
            const upJson = await upRes.json();
            if (upJson.url) finalPhotoUrl = upJson.url;
          }
        } catch (upErr) {
          console.warn("Upload drive gagal, fallback base64:", upErr);
        }
      }

      const generatedTicketId = `TKT-GABUNGAN-${Date.now().toString().slice(-6)}`;

      const newTicketPayload = {
        ticketId: generatedTicketId,
        category: category || 'Inspeksi Gabungan',
        source: 'sidak_management',
        location: effectiveLocation,
        description: description.trim(),
        priority: priority || 'Medium',
        risk: priority || 'Medium',
        pic: pic.trim() || '-',
        photoUrl: finalPhotoUrl,
        requestorName: currentUserName ? (currentUserNik ? `${currentUserName} (${currentUserNik})` : currentUserName) : 'Management Sidak Team',
        status: 'OPEN',
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        pt: localStorage.getItem('bulletin_active_universe') || 'TBP'
      };

      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTicketPayload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Gagal menyimpan temuan ke database tiket');
      }

      const created = await res.json();
      toast.success(`✅ Temuan Sidak [${generatedTicketId}] berhasil dicatat!`, { id: 'create-finding' });

      window.dispatchEvent(new CustomEvent('refresh-tickets'));

      if (onCreated) {
        onCreated(created);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(`Gagal mencatat temuan: ${err.message}`, { id: 'create-finding' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        onPaste={handlePaste}
        className="fixed inset-0 z-[125] flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-950/70 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-teal-500/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-lg shadow-sm">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Input Temuan Sidak Management
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Kategori Khusus: <strong className="text-amber-700 dark:text-amber-400">Inspeksi Gabungan</strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
            {/* Tanggal & Prioritas Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-teal-600" />
                  <span>Tanggal Sidak</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Tingkat Risiko / Prioritas</span>
                  <span className="text-rose-500">*</span>
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Low">Low (Rendah)</option>
                  <option value="Medium">Medium (Sedang)</option>
                  <option value="High">High (Tinggi)</option>
                  <option value="Critical">Critical (Kritis / Segera)</option>
                </select>
              </div>
            </div>

            {/* Area / Lokasi */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>Area / Lokasi Sidak</span>
                <span className="text-rose-500">*</span>
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {COMMON_AREAS.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>

              {location === 'Lainnya / Area Khusus' && (
                <input
                  type="text"
                  required
                  placeholder="Ketik nama lokasi atau area spesifik..."
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                  className="w-full mt-2 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              )}
            </div>

            {/* Deskripsi Temuan */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <span>Rincian Deskripsi Temuan Sidak</span>
                <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Jelaskan kondisi atau temuan tidak aman/ketidaksesuaian yang ditemukan saat sidak management..."
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              />
            </div>

            {/* PIC Penanggung Jawab (Validasi Roster & Cari berdasarkan NIK/Nama) */}
            <EmployeeRosterSelect
              id="sidak-finding-pic"
              value={pic}
              onChange={(formattedVal, emp) => {
                setPic(formattedVal);
                setSelectedPicEmployee(emp);
                if (emp) setPicValidationError(null);
              }}
              employeesList={employeesList}
              label="PIC / Penanggung Jawab Tindak Lanjut"
              placeholder="Cari berdasarkan NIK (misal: 04D...) atau Nama Karyawan di roster..."
              required={true}
              error={picValidationError}
              accentColor="amber"
              helperText="Hanya personil yang terdaftar aktif dalam database roster yang dapat ditetapkan sebagai PIC."
            />

            {/* Foto Temuan Awal */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-amber-500" />
                  <span>Foto Temuan Awal (Opsional / Dianjurkan)</span>
                </label>
                <span className="text-[10px] text-slate-400 italic">
                  Kamera / File / Paste
                </span>
              </div>

              {photoPreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-amber-500/40 bg-slate-950 max-h-48 flex items-center justify-center group">
                  <img src={photoPreview} alt="Temuan Awal" className="w-full h-48 object-contain" />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoPreview(null);
                      setPhotoFile(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs shadow-md transition-colors"
                    title="Hapus / Ganti Foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>Foto Siap Disimpan</span>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 rounded-2xl p-4 text-center space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-all cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Ambil Foto</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Pilih File</span>
                    </button>
                  </div>

                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileChange(f);
                    }}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileChange(f);
                    }}
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !description.trim() || !selectedPicEmployee}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-600 text-white shadow-md shadow-amber-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan Temuan Sidak...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    <span>Simpan Temuan Sidak & Tautkan ke Labnote</span>
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
