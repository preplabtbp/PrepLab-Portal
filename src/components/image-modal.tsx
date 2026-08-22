import React from 'react';
import { X, ExternalLink } from 'lucide-react';

export function ImageModal({ imageUrl, onClose }: { imageUrl: string | null; onClose: () => void }) {
  if (!imageUrl) return null;
  
  const formattedUrl = (() => {
    if (!imageUrl || imageUrl === '-') return null;
    let match = imageUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                imageUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
                imageUrl.match(/\/view\/([a-zA-Z0-9_-]+)/) ||
                imageUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1600`;
    }
    return imageUrl;
  })();
  
  if (!formattedUrl) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
      <div className="relative max-w-4xl w-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors bg-black/20 rounded-full">
          <X className="w-6 h-6" />
        </button>
        <img src={formattedUrl} referrerPolicy="no-referrer" alt="Attachment" className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl" />
        <div className="absolute -bottom-12 left-0 right-0 flex justify-center">
          <button onClick={() => window.open(formattedUrl, '_blank', 'noopener,noreferrer')} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors backdrop-blur-md border border-white/10 flex items-center gap-2">
            <ExternalLink className="w-4 h-4" /> Buka di Tab Baru
          </button>
        </div>
      </div>
    </div>
  );
}
