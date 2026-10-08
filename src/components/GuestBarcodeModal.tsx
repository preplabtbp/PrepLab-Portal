import React, { useRef, useState } from 'react';
import { 
  X, Printer, Copy, Check, QrCode, ExternalLink, 
  Download, ShieldCheck, Sparkles, Building2, Info
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui';

interface GuestBarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuestBarcodeModal: React.FC<GuestBarcodeModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Master guest monitoring URL
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://preplab.id';
  const guestUrl = `${origin}/guest/monitoring`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(guestUrl)}&margin=10`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(guestUrl);
      setCopied(true);
      toast.success('Link portal tamu & auditor berhasil disalin!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Gagal menyalin link');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQr = () => {
    const a = document.createElement('a');
    a.href = qrImageUrl;
    a.download = 'QR_Code_Master_Pemantauan_PrepLab.png';
    a.target = '_blank';
    a.click();
    toast.success('Gambar QR Code diunduh');
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      {/* Print Specific CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-sticker-card, #printable-sticker-card * {
            visibility: visible;
          }
          #printable-sticker-card {
            position: fixed;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 100mm;
            max-width: 100mm;
            border: 2px solid #000;
            box-shadow: none !important;
            margin: 0;
            padding: 8mm;
          }
        }
      `}</style>

      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-[var(--border-main)] flex flex-col overflow-hidden my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-xs">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>Master Barcode Tamu &amp; Auditor</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-500/20">
                  1 Barcode General
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Cetak dan tempel stiker ini di area lab untuk akses pemantauan real-time
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Printable Sticker Preview Card */}
          <div 
            id="printable-sticker-card"
            ref={printableRef}
            className="bg-white text-slate-900 p-5 rounded-2xl border-2 border-slate-900 shadow-md flex flex-col items-center text-center space-y-3 relative overflow-hidden"
          >
            {/* Top Brand Header */}
            <div className="flex items-center justify-between w-full border-b-2 border-slate-900 pb-2.5">
              <div className="flex items-center gap-2 text-left">
                <div className="w-7 h-7 rounded-lg bg-teal-600 p-1 flex items-center justify-center text-white">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black tracking-tight text-slate-900 font-display uppercase leading-tight">
                    PREPLAB &bull; HARITA
                  </div>
                  <div className="text-[8.5px] font-bold text-teal-700 uppercase tracking-wider font-mono">
                    Laboratorium Preparasi
                  </div>
                </div>
              </div>

              <div className="px-2 py-0.5 rounded bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider">
                SAFETY FIRST
              </div>
            </div>

            {/* Sticker Title */}
            <div>
              <h4 className="text-sm font-black uppercase tracking-wide text-slate-900 font-display">
                Portal Pemantauan Lingkungan
              </h4>
              <p className="text-[10px] text-slate-600 font-medium">
                Suhu Ruangan &bull; Kelembaban (RH) &bull; Tekanan Gas
              </p>
            </div>

            {/* High-Resolution QR Code */}
            <div className="p-2.5 rounded-2xl bg-white border border-slate-300 shadow-inner">
              <img 
                src={qrImageUrl} 
                alt="QR Code Pemantauan PrepLab" 
                className="w-44 h-44 object-contain rounded-lg"
              />
            </div>

            {/* Instruction for Guest/Auditor */}
            <div className="space-y-1 max-w-xs">
              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-300">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Pindai kamera HP untuk melihat log &amp; sertifikasi</span>
              </div>
              <p className="text-[9px] font-mono text-slate-500 truncate pt-0.5">
                {guestUrl}
              </p>
            </div>

            {/* Footer Sticker Note */}
            <div className="w-full pt-2 border-t border-dashed border-slate-400 text-[8px] font-mono text-slate-500 flex justify-between items-center">
              <span>SOP LAB-ENV-001 &bull; ASTM D3302</span>
              <span>VERIFIKASI REAL-TIME</span>
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-cyan-600" />
              <span>Petunjuk Penggunaan:</span>
            </div>
            <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
              <li>Tempel stiker ini di pintu masuk laboratorium atau di setiap ruangan pemantauan.</li>
              <li>Tamu dan auditor dapat memilih ruangan secara bebas (*Balance Room, XRF, Chiller, Gas Station*) saat berada di halaman portal.</li>
              <li>Akses ini bersifat <strong>Read-Only</strong> dan tidak memerlukan login atau NIK karyawan.</li>
            </ul>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin!' : 'Salin Link'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadQr}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh QR</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={guestUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 flex items-center gap-1.5 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka Tampilan Tamu</span>
            </a>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-700 text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Stiker</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
