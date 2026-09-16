import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Download, 
  ExternalLink, 
  FileText, 
  Eye, 
  Send, 
  Copy, 
  Check, 
  X, 
  ShieldCheck, 
  Sparkles,
  Layers,
  MapPin,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { getAppSettings } from '../sheets-api';

export const GENERAL_INSPECTION_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScOJSC6wcLsJ26YcmwWndj0Hb9x5V48XHTdHWkPzbH2XwN8ww/viewform';

export interface InspectionCompletionData {
  isOpen?: boolean;
  pdfUrl?: string | null;
  linkPdf2?: string | null;
  waMessageText?: string;
  formTitle?: string;
  location?: string;
  id?: number | string;
  inspectorName?: string;
  inspectorNik?: string;
}

interface InspectionCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: InspectionCompletionData | null;
}

export function InspectionCompletionModal({ isOpen, onClose, data }: InspectionCompletionModalProps) {
  const [targetNumber, setTargetNumber] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getAppSettings()
        .then((settings) => {
          if (settings && settings.success && settings.data) {
            const found = settings.data.find((s: any) => s.settingKey === 'WA_TARGET_NUMBER');
            if (found && found.settingValue) {
              setTargetNumber(found.settingValue);
            }
          }
        })
        .catch((e) => console.error('Error fetching WA target setting:', e));
    }
  }, [isOpen]);

  if (!isOpen || !data) return null;

  const pdfUrl = data.pdfUrl;
  const linkPdf2 = data.linkPdf2;
  const waMessageText = data.waMessageText || '';
  const formTitle = data.formTitle || 'Inspeksi Rutin Mingguan';
  const location = data.location;

  // Helper to extract fileId from Google Drive link if available
  const extractDriveFileId = (rawUrl?: string | null) => {
    if (!rawUrl) return null;
    const match = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  const getDirectDownloadUrl = (rawUrl?: string | null) => {
    if (!rawUrl || rawUrl === '#' || rawUrl === '-') return null;
    const fileId = extractDriveFileId(rawUrl);
    if (fileId) {
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
    return rawUrl;
  };

  const getPreviewUrl = (rawUrl?: string | null) => {
    if (!rawUrl || rawUrl === '#' || rawUrl === '-') return null;
    const fileId = extractDriveFileId(rawUrl);
    if (fileId) {
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }
    if (rawUrl.startsWith('http')) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(rawUrl)}&embedded=true`;
    }
    return rawUrl;
  };

  const downloadUrl1 = getDirectDownloadUrl(pdfUrl);
  const previewUrl1 = getPreviewUrl(pdfUrl);

  const downloadUrl2 = getDirectDownloadUrl(linkPdf2);
  const previewUrl2 = getPreviewUrl(linkPdf2);

  const handleCopyWaText = () => {
    if (!waMessageText) return;
    navigator.clipboard.writeText(waMessageText);
    setCopied(true);
    toast.success('Teks laporan berhasil disalin ke clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendWhatsApp = () => {
    let waUrl = `https://wa.me/?text=${encodeURIComponent(waMessageText)}`;

    if (targetNumber) {
      if (targetNumber.includes('chat.whatsapp.com')) {
        waUrl = `https://wa.me/?text=${encodeURIComponent(waMessageText)}`;
      } else {
        const firstPart = targetNumber.split(/[,\/&]/)[0];
        let cleanNumber = firstPart.replace(/\D/g, '');
        if (cleanNumber) {
          if (cleanNumber.startsWith('0')) {
            cleanNumber = '62' + cleanNumber.substring(1);
          }
          waUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(waMessageText)}`;
        }
      }
    }

    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[var(--card-bg,#ffffff)] text-[var(--text-main,#0f172a)] border border-[var(--border-main,#e2e8f0)] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        {/* Header with success badge */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-teal-700 p-5 sm:p-6 text-white text-center shrink-0">
          <button 
            type="button"
            onClick={onClose} 
            className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
            aria-label="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Decorative glows */}
          <div className="absolute -top-12 -left-12 w-36 h-36 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-36 h-36 bg-teal-300/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative flex flex-col items-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/15 backdrop-blur-sm border border-white/25 rounded-2xl flex items-center justify-center shadow-lg mb-3">
              <CheckCircle2 className="w-8 h-8 sm:w-9 sm:h-9 text-emerald-200" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold tracking-wide text-emerald-100 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Inspeksi Selesai Disimpan</span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white line-clamp-2 px-4">
              {formTitle}
            </h2>

            {location && (
              <div className="flex items-center gap-1 text-xs text-emerald-100/90 mt-1">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-[280px]">{location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">

          {/* SECTION 1: Safety General Submit Action (Prominent CTA) */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-orange-500/10 p-4 sm:p-4.5 transition-all shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-600 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="text-sm font-bold text-[var(--text-main,#0f172a)]">
                    Form General Inspeksi Safety
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-extrabold uppercase tracking-wider">
                    Wajib K3
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted,#475569)] leading-relaxed mb-3">
                  Silakan buka formulir general inspeksi milik Safety dan kirimkan tangkapan layar (screenshot) sebagai bukti rekap mingguan.
                </p>

                <a
                  href={GENERAL_INSPECTION_FORM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-md shadow-amber-500/25 transition-all transform active:scale-98 cursor-pointer text-center"
                >
                  <span>Buka Halaman General Submit Milik Safety</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* SECTION 2: Download Dokumen PDF */}
          <div className="rounded-2xl border border-[var(--border-main,#e2e8f0)] bg-[var(--input-bg,#f8fafc)] p-4 sm:p-4.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[var(--text-main,#0f172a)]">
                    Dokumen Laporan Hasil Inspeksi
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted,#64748b)]">
                    File PDF resmi hasil inspeksi siap diunduh atau dipratinjau.
                  </p>
                </div>
              </div>
            </div>

            {/* Primary Document (TBP / Universal / APD) */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              {downloadUrl1 ? (
                <>
                  <a
                    href={downloadUrl1}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-all transform active:scale-98 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF {linkPdf2 ? '(TBP)' : 'Laporan'}</span>
                  </a>

                  {previewUrl1 && (
                    <a
                      href={previewUrl1}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border-main,#cbd5e1)] bg-[var(--card-bg,#ffffff)] text-[var(--text-main,#334155)] hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
                      title="Buka Viewer PDF"
                    >
                      <Eye className="w-4 h-4 text-teal-600" />
                      <span>Preview</span>
                    </a>
                  )}
                </>
              ) : (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>PDF sedang diproses oleh server di latar belakang. Tersedia segera di grup feed & feed keselamatan.</span>
                </div>
              )}
            </div>

            {/* Secondary Document (e.g. GPS PDF) */}
            {linkPdf2 && downloadUrl2 && (
              <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-[var(--border-main,#e2e8f0)]">
                <a
                  href={downloadUrl2}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-sm transition-all transform active:scale-98 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF (GPS)</span>
                </a>

                {previewUrl2 && (
                  <a
                    href={previewUrl2}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border-main,#cbd5e1)] bg-[var(--card-bg,#ffffff)] text-[var(--text-main,#334155)] hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
                    title="Buka Viewer PDF GPS"
                  >
                    <Eye className="w-4 h-4 text-sky-600" />
                    <span>Preview</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* SECTION 3: WhatsApp Notification (Preserved Functionality) */}
          {waMessageText && (
            <div className="rounded-2xl border border-[var(--border-main,#e2e8f0)] bg-[var(--card-bg,#ffffff)] p-3.5 sm:p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-main,#0f172a)] flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-emerald-600" />
                  Kirim Notifikasi via WhatsApp
                </span>
                {targetNumber && (
                  <span className="text-[10.5px] text-[var(--text-muted,#64748b)]">
                    Target: {targetNumber}
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-500/20 transition-all transform active:scale-98 cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                  </svg>
                  <span>Kirim Laporan via WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyWaText}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-[var(--border-main,#cbd5e1)] bg-[var(--card-bg,#ffffff)] text-[var(--text-main,#334155)] hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
                  title="Salin Teks Laporan"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-[var(--input-bg,#f8fafc)] border-t border-[var(--border-main,#e2e8f0)] flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            Selesai & Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
