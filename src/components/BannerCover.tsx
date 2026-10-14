import React, { useState, useEffect, useRef } from 'react';
import { Camera, Move, Check, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface BannerCoverProps {
  coverImage?: string | null;
  postId?: string | number;
  alt?: string;
  onOpenChangeModal: () => void;
  onSavePosition?: (pos: number) => void;
  className?: string;
  heightClass?: string;
  canAdd?: boolean;
}

export const BannerCover: React.FC<BannerCoverProps> = ({
  coverImage,
  postId,
  alt = 'Cover Banner',
  onOpenChangeModal,
  onSavePosition,
  className = '',
  heightClass = 'h-48 md:h-64',
  canAdd = true
}) => {
  // Extract initial position from hash or localStorage
  const getInitialPosition = (): number => {
    if (coverImage) {
      const match = coverImage.match(/#pos=(\d+)/);
      if (match) {
        return Math.min(100, Math.max(0, parseInt(match[1], 10)));
      }
    }
    if (postId) {
      const saved = localStorage.getItem(`preplab_banner_pos_${postId}`);
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed)) return Math.min(100, Math.max(0, parsed));
      }
    }
    return 50; // Default center
  };

  const [position, setPosition] = useState<number>(getInitialPosition);
  const [tempPosition, setTempPosition] = useState<number>(getInitialPosition);
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartYRef = useRef<number>(0);
  const dragStartPosRef = useRef<number>(50);

  // Sync initial position when coverImage or postId changes
  useEffect(() => {
    const init = getInitialPosition();
    setPosition(init);
    setTempPosition(init);
  }, [coverImage, postId]);

  const handleStartReposition = () => {
    setTempPosition(position);
    setIsRepositioning(true);
  };

  const handleSaveReposition = () => {
    setPosition(tempPosition);
    setIsRepositioning(false);
    if (postId) {
      localStorage.setItem(`preplab_banner_pos_${postId}`, String(tempPosition));
    }
    if (onSavePosition) {
      onSavePosition(tempPosition);
    }
    toast.success(`Posisi banner disimpan (${tempPosition}%)`);
  };

  const handleCancelReposition = () => {
    setTempPosition(position);
    setIsRepositioning(false);
  };

  // Drag handlers for direct mouse dragging on the banner
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isRepositioning) return;
    setIsDragging(true);
    dragStartYRef.current = e.clientY;
    dragStartPosRef.current = tempPosition;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isRepositioning || !isDragging || !containerRef.current) return;
    const height = containerRef.current.clientHeight || 200;
    // Moving mouse down should pull image down (lower percentage = showing top),
    // Moving mouse up should push image up (higher percentage = showing bottom)
    const deltaY = e.clientY - dragStartYRef.current;
    const deltaPercent = (deltaY / height) * 100;
    const newPos = Math.min(100, Math.max(0, Math.round(dragStartPosRef.current - deltaPercent)));
    setTempPosition(newPos);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isRepositioning) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  if (!coverImage) {
    if (!canAdd) return null;
    return (
      <div className={`mb-3 flex justify-end ${className}`}>
        <button
          type="button"
          onClick={onOpenChangeModal}
          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
        >
          <ImageIcon className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>+ Tambah Cover Banner</span>
        </button>
      </div>
    );
  }

  // Clean URL without pos hash for <img> src
  const cleanCoverUrl = coverImage.replace(/#pos=\d+/, '');
  const displayPos = isRepositioning ? tempPosition : position;

  return (
    <div
      ref={containerRef}
      className={`w-full ${heightClass} rounded-xl overflow-hidden mb-3 border border-slate-200/80 dark:border-slate-800 shadow-xs relative group select-none ${className}`}
    >
      {/* Banner Image */}
      <img
        src={cleanCoverUrl}
        alt={alt}
        draggable={false}
        style={{ objectPosition: `center ${displayPos}%`, userSelect: 'none' }}
        className={`w-full h-full object-cover transition-[object-position] select-none pointer-events-none ${
          isRepositioning ? (isDragging ? 'duration-0' : 'duration-75') : 'duration-300'
        }`}
      />

      {/* Repositioning Control Bar Overlay */}
      {isRepositioning ? (
        <div 
          className={`absolute inset-0 bg-black/40 backdrop-blur-xs flex flex-col justify-between p-3 z-30 animate-in fade-in duration-150 select-none ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{ touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Top Instruction & Slider Controls (Stop pointer propagation so dragging slider/buttons works properly) */}
          <div 
            className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/95 border border-white/20 rounded-xl px-4 py-2.5 shadow-2xl backdrop-blur-md cursor-default"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-white text-xs font-medium">
              <Move className="w-4 h-4 text-teal-400 animate-pulse" />
              <span>Geser gambar (tahan & geser) atau gunakan slider:</span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                value={tempPosition}
                onChange={(e) => setTempPosition(Number(e.target.value))}
                className="w-28 sm:w-40 md:w-56 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-400"
                title="Atur posisi vertikal banner (0% = atas, 100% = bawah)"
              />
              <span className="font-mono text-xs font-bold text-teal-300 w-9 text-right">
                {tempPosition}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelReposition}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 border border-slate-600 transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Batal</span>
              </button>
              <button
                type="button"
                onClick={handleSaveReposition}
                className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Posisi</span>
              </button>
            </div>
          </div>

          {/* Center drag hint */}
          <div className="flex items-center justify-center pointer-events-none">
            <div className="px-3 py-1.5 rounded-full bg-black/60 text-white text-xs font-medium tracking-wide border border-white/20 backdrop-blur-xs flex items-center gap-1.5 shadow-lg">
              <Move className="w-3.5 h-3.5 text-lime-400" />
              <span>Klik & geser gambar untuk menyesuaikan posisi vertikal</span>
            </div>
          </div>

          {/* Empty spacer for bottom balance */}
          <div className="h-2" />
        </div>
      ) : (
        /* Normal State: Hover Action Buttons */
        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-3 gap-2">
          {/* Reposition Button */}
          <button
            type="button"
            onClick={handleStartReposition}
            className="px-3 py-1.5 rounded-lg bg-black/80 hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 backdrop-blur-xs shadow-md transition-all cursor-pointer border border-white/10"
            title="Sesuaikan posisi vertikal gambar cover ini"
          >
            <Move className="w-3.5 h-3.5 text-teal-400" />
            <span>Atur Posisi</span>
          </button>

          {/* Change Cover Button */}
          <button
            type="button"
            onClick={onOpenChangeModal}
            className="px-3 py-1.5 rounded-lg bg-black/80 hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 backdrop-blur-xs shadow-md transition-all cursor-pointer border border-white/10"
            title="Ganti gambar cover banner"
          >
            <Camera className="w-3.5 h-3.5 text-lime-400" />
            <span>Ganti Cover Banner</span>
          </button>
        </div>
      )}
    </div>
  );
};
