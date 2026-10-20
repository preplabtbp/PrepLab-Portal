import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, CheckCircle2, AlertTriangle, Camera, Upload, Trash2, 
  ExternalLink, ZoomIn, ShieldCheck, MapPin, Tag, Calendar, 
  User, Loader2, Image as ImageIcon, FileText, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { compressImage } from '../../features/inspections/hooks/useInspection';
import { triggerExpGain } from '../../lib/gamificationEvents';
import { formatProofImageUrl } from '../SimplifiedInspectionModal';
import { EmployeeRosterSelect } from './EmployeeRosterSelect';

interface FindingResolutionModalProps {
  isOpen: boolean;
  ticket: any | null;
  ticketId?: string;
  initialMode?: 'view' | 'resolve';
  currentUserName?: string;
  currentUserNik?: string;
  employeesList?: any[];
  onClose: () => void;
  onResolved?: (updatedTicket: any) => void;
}

export function FindingResolutionModal({
  isOpen,
  ticket: initialTicket,
  ticketId: propTicketId,
  initialMode = 'resolve',
  currentUserName = '',
  currentUserNik = '',
  employeesList,
  onClose,
  onResolved
}: FindingResolutionModalProps) {
  const [ticket, setTicket] = useState<any | null>(initialTicket);
  const [loadingTicket, setLoadingTicket] = useState<boolean>(false);
  const [mode, setMode] = useState<'view' | 'resolve'>(initialMode);

  // Form State for Resolution
  const [actionTaken, setActionTaken] = useState<string>('');
  const [picName, setPicName] = useState<string>(
    currentUserName ? (currentUserNik ? `${currentUserName} (${currentUserNik})` : currentUserName) : ''
  );
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedZoomImage, setSelectedZoomImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const targetId = ticket?.ticketId || propTicketId;

  // Sync / fetch ticket details if needed
  useEffect(() => {
    if (initialTicket) {
      setTicket(initialTicket);
      if (initialTicket.actionTaken) setActionTaken(initialTicket.actionTaken);
      if (initialTicket.pic) setPicName(initialTicket.pic);
      if (initialTicket.closingPhoto && initialTicket.closingPhoto !== '-') {
        setPhotoPreview(initialTicket.closingPhoto);
      }
    } else if (propTicketId && isOpen) {
      setLoadingTicket(true);
      fetch('/api/tickets')
        .then(res => res.json())
        .then((all: any[]) => {
          if (Array.isArray(all)) {
            const found = all.find(t => t.ticketId === propTicketId || String(t.id) === propTicketId);
            if (found) {
              setTicket(found);
              if (found.actionTaken) setActionTaken(found.actionTaken);
              if (found.pic) setPicName(found.pic);
              if (found.closingPhoto && found.closingPhoto !== '-') {
                setPhotoPreview(found.closingPhoto);
              }
            }
          }
        })
        .catch(err => {
          console.error("Gagal memuat detail tiket:", err);
        })
        .finally(() => {
          setLoadingTicket(false);
        });
    }
  }, [initialTicket, propTicketId, isOpen]);

  // Handle image file selection
  const handleFileChange = async (file: File) => {
    if (!file) return;
    try {
      const compressedBase64 = await compressImage(file);
      setPhotoFile(file);
      setPhotoPreview(compressedBase64);
      toast.success("Foto bukti perbaikan berhasil dimuat!");
    } catch {
      toast.error("Gagal memproses gambar foto bukti");
    }
  };

  // Paste listener for screenshot pasting
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

  // Submit resolution to backend
  const handleSubmitResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId) return;

    if (!actionTaken.trim()) {
      toast.error("Wajib mengisi tindakan perbaikan yang telah dilakukan!");
      return;
    }

    // MANDATORY PHOTO VALIDATION
    if (!photoPreview && !photoFile) {
      toast.error("WAJIB mengunggah foto bukti fisik perbaikan/closing!");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading(`Menyimpan penyelesaian temuan [${targetId}]...`, { id: 'resolve-finding' });

    try {
      let finalPhotoUrl = photoPreview || '';

      // Upload file to server if file object is present
      if (photoFile && photoPreview?.startsWith('data:image')) {
        try {
          const upRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base64Data: photoPreview,
              mimeType: 'image/jpeg',
              filename: `CLOSING_${targetId}_${Date.now()}.jpg`,
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

      const res = await fetch(`/api/tickets/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CLOSED',
          actionTaken: actionTaken.trim(),
          closingPhoto: finalPhotoUrl || '-',
          pic: picName.trim() || currentUserName || 'PIC QA/Supervisor',
          completionDate: new Date().toISOString()
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Gagal menyimpan penutupan temuan ke server');
      }

      const updated = await res.json();
      toast.success(`✅ Temuan ${targetId} berhasil dituntaskan & ditutup! (+60 EXP)`, { 
        id: 'resolve-finding',
        duration: 4000 
      });

      triggerExpGain(60, 'Penuntasan Temuan Hasil Inspeksi');
      window.dispatchEvent(new Event('gamification_updated'));
      window.dispatchEvent(new CustomEvent('refresh-tickets'));

      if (onResolved) {
        onResolved(updated);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(`Gagal menyelesaikan temuan: ${err.message}`, { id: 'resolve-finding' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isClosed = (ticket?.status || '').toUpperCase() === 'CLOSED' || (ticket?.status || '').toUpperCase() === 'SELESAI';
  const initialPhotoUrl = formatProofImageUrl(ticket?.photoUrl);
  const closingPhotoUrl = formatProofImageUrl(ticket?.closingPhoto || photoPreview);

  return (
    <AnimatePresence>
      <div 
        onPaste={handlePaste}
        className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-950/70 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm ${
                isClosed 
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
              }`}>
                {isClosed ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {mode === 'resolve' && !isClosed ? 'Penuntasan Temuan (Closing)' : 'Detail Temuan Inspeksi'}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isClosed 
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700' 
                      : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                  }`}>
                    {ticket?.status || (isClosed ? 'CLOSED' : 'OPEN')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  ID Tiket: <strong className="text-teal-700 dark:text-teal-400">{targetId || '-'}</strong>
                  {ticket?.category ? ` • ${ticket.category}` : ''}
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

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {loadingTicket ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                <span className="text-xs">Memuat informasi temuan...</span>
              </div>
            ) : (
              <>
                {/* Finding Summary Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Area / Lokasi
                      </span>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>{ticket?.location || 'Area Operasional Prep & Lab'}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {ticket?.priority && (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                          Prioritas: {ticket.priority}
                        </span>
                      )}
                      {ticket?.date && (
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{new Date(ticket.date).toLocaleDateString('id-ID')}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Deskripsi Temuan
                    </span>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200/70 dark:border-slate-700 whitespace-pre-wrap">
                      {ticket?.description || 'Tidak ada deskripsi rinci temuan.'}
                    </p>
                  </div>

                  {ticket?.requestorName && (
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Pelapor: <strong>{ticket.requestorName}</strong></span>
                    </div>
                  )}
                </div>

                {/* Initial Finding Photo */}
                {initialPhotoUrl && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-rose-500" />
                      <span>Foto Temuan Awal (Kondisi Saat Sidak/Inspeksi):</span>
                    </label>
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-56 bg-slate-950 flex items-center justify-center group">
                      <img 
                        src={initialPhotoUrl} 
                        alt="Temuan Awal"
                        className="w-full h-56 object-contain group-hover:scale-102 transition-transform cursor-pointer"
                        onClick={() => setSelectedZoomImage(initialPhotoUrl)}
                      />
                      <button
                        type="button"
                        onClick={() => setSelectedZoomImage(initialPhotoUrl)}
                        className="absolute bottom-2 right-2 px-2.5 py-1 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg text-xs font-medium backdrop-blur-xs flex items-center gap-1 transition-opacity opacity-90 group-hover:opacity-100"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                        <span>Perbesar</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* If Already Closed, show closing verification card */}
                {isClosed && (
                  <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Temuan Ini Telah Tuntas & Ditutup (Closed)</span>
                    </div>

                    {closingPhotoUrl && (
                      <div>
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                          Foto Bukti Perbaikan Fisik:
                        </span>
                        <div className="relative rounded-xl overflow-hidden border border-emerald-300 dark:border-emerald-700 max-h-52 bg-slate-950 flex items-center justify-center group">
                          <img 
                            src={closingPhotoUrl} 
                            alt="Bukti Perbaikan"
                            className="w-full h-52 object-contain group-hover:scale-102 transition-transform cursor-pointer"
                            onClick={() => setSelectedZoomImage(closingPhotoUrl)}
                          />
                          <button
                            type="button"
                            onClick={() => setSelectedZoomImage(closingPhotoUrl)}
                            className="absolute bottom-2 right-2 px-2.5 py-1 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg text-xs font-medium backdrop-blur-xs flex items-center gap-1"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                            <span>Perbesar Bukti</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {ticket?.actionTaken && (
                      <div>
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block mb-0.5">
                          Tindakan Perbaikan:
                        </span>
                        <p className="text-xs text-slate-800 dark:text-slate-200 bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                          {ticket.actionTaken}
                        </p>
                      </div>
                    )}

                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center justify-between pt-1">
                      <span>PIC Penyelesaian: <strong>{ticket?.pic || '-'}</strong></span>
                      <span>
                        Waktu Selesai: {ticket?.completionDate ? new Date(ticket.completionDate).toLocaleString('id-ID') : '-'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Resolution Form (Visible if ticket is still OPEN or user wants to update) */}
                {!isClosed && (
                  <form onSubmit={handleSubmitResolution} className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                      <ShieldCheck className="w-4 h-4 text-teal-600" />
                      <span>Formulir Penyelesaian Temuan Fisik</span>
                    </div>

                    {/* Tindakan Perbaikan */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <span>Tindakan Perbaikan yang Telah Dilakukan</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={actionTaken}
                        onChange={(e) => setActionTaken(e.target.value)}
                        placeholder="Contoh: Telah dilakukan pembersihan tumpahan, perapihan kabel, pemasangan barikade, penggantian unit baru, dll..."
                        className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                      />
                    </div>

                    {/* PIC Penyelesaian (Validasi Roster & Cari Berdasarkan NIK/Nama) */}
                    <EmployeeRosterSelect
                      id="resolution-pic-select"
                      value={picName}
                      onChange={(formattedVal) => setPicName(formattedVal)}
                      employeesList={employeesList}
                      label="Nama / NIK PIC Penanggung Jawab Penyelesaian"
                      placeholder="Cari berdasarkan NIK atau Nama Karyawan di roster..."
                      required={true}
                      accentColor="teal"
                      helperText="Pilih personil yang bertanggung jawab menyelesaikan temuan fisik ini dari roster."
                    />

                    {/* MANDATORY PHOTO UPLOAD */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-teal-600" />
                          <span>Foto Bukti Fisik Perbaikan (Closing)</span>
                          <span className="text-rose-600 font-extrabold text-xs">* (WAJIB)</span>
                        </label>
                        <span className="text-[10px] text-slate-400 italic">
                          Mendukung Kamera, File, atau Paste (Ctrl+V)
                        </span>
                      </div>

                      {photoPreview ? (
                        <div className="relative rounded-2xl overflow-hidden border-2 border-teal-500/50 bg-slate-950 max-h-56 flex items-center justify-center group">
                          <img 
                            src={photoPreview} 
                            alt="Bukti Selesai" 
                            className="w-full h-56 object-contain"
                          />
                          <div className="absolute top-2 right-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedZoomImage(photoPreview)}
                              className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-900 text-white text-xs backdrop-blur-xs transition-colors"
                              title="Perbesar"
                            >
                              <ZoomIn className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPhotoPreview(null);
                                setPhotoFile(null);
                              }}
                              className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs shadow-md transition-colors"
                              title="Hapus / Ganti Foto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="absolute bottom-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Foto Bukti Siap Diunggah</span>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="border-2 border-dashed border-rose-300 dark:border-rose-900/60 hover:border-teal-500 bg-rose-50/30 dark:bg-rose-950/10 rounded-2xl p-6 text-center transition-colors space-y-3"
                        >
                          <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                            <Upload className="w-6 h-6" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                              Unggah atau Ambil Foto Bukti Fisik Perbaikan
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Penutupan temuan mewajibkan lampiran foto dokumentasi fisik lapangan
                            </p>
                          </div>

                          <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() => cameraInputRef.current?.click()}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-all cursor-pointer"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>Buka Kamera</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition-all cursor-pointer"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span>Pilih File Gambar</span>
                            </button>
                          </div>

                          {/* Hidden Inputs */}
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
                    <div className="pt-3">
                      <button
                        type="submit"
                        disabled={isSubmitting || !photoPreview || !actionTaken.trim()}
                        className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-500 hover:to-emerald-600 text-white shadow-lg shadow-teal-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Menyimpan & Menutup Temuan...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            <span>Tuntaskan Temuan & Selesaikan Subtask Labnote</span>
                          </>
                        )}
                      </button>
                      {!photoPreview && (
                        <p className="text-center text-[11px] text-rose-500 font-medium mt-2">
                          * Tombol submit aktif setelah foto bukti perbaikan diunggah.
                        </p>
                      )}
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </motion.div>

        {/* Zoom Image Lightbox */}
        {selectedZoomImage && (
          <div 
            className="fixed inset-0 z-[150] bg-slate-950/90 flex items-center justify-center p-4 backdrop-blur-md"
            onClick={() => setSelectedZoomImage(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <img 
                src={selectedZoomImage} 
                alt="Zoomed" 
                className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-white/20"
              />
              <button
                type="button"
                onClick={() => setSelectedZoomImage(null)}
                className="absolute -top-3 -right-3 p-2 rounded-full bg-slate-900 text-white hover:bg-slate-800 border border-white/30 shadow-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}
