import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, RotateCcw, Download, ExternalLink, Move } from 'lucide-react';

export interface ImageModalProps {
  imageUrl: string | null;
  title?: string;
  driveViewUrl?: string;
  driveDownloadUrl?: string;
  onClose: () => void;
}

export function ImageModal({
  imageUrl,
  title = 'Image Preview',
  driveViewUrl,
  driveDownloadUrl,
  onClose,
}: ImageModalProps) {
  if (!imageUrl) return null;

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDragMoved = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const mouseDownPosRef = useRef({ x: 0, y: 0 });

  // Extract Google Drive ID if present
  const driveId = (() => {
    if (!imageUrl || imageUrl === '-') return null;
    const str = `${imageUrl} ${driveViewUrl || ''} ${driveDownloadUrl || ''}`;
    const match =
      str.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
      str.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
      str.match(/\/view\/([a-zA-Z0-9_-]+)/) ||
      str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  })();

  const highResUrl = driveId ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w2500` : imageUrl;
  const directDriveView = driveViewUrl || (driveId ? `https://drive.google.com/file/d/${driveId}/view?usp=sharing` : null);
  const directDriveDownload = driveDownloadUrl || (driveId ? `https://drive.google.com/uc?id=${driveId}&export=download` : null);

  // Reset zoom & pan when image changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
    isDragMoved.current = false;
  }, [imageUrl]);

  // Handle Ctrl+Wheel and Wheel zoom with passive: false to prevent browser page zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      setScale((prevScale) => {
        const nextScale = Math.min(Math.max(prevScale * zoomFactor, 0.4), 6);
        if (nextScale <= 1) {
          setPosition({ x: 0, y: 0 });
        }
        return nextScale;
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Global mousemove and mouseup listeners for seamless dragging
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const dist = Math.hypot(e.clientX - mouseDownPosRef.current.x, e.clientY - mouseDownPosRef.current.y);
      if (dist > 4) {
        isDragMoved.current = true;
      }

      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    };

    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        // Delay resetting isDragMoved so the subsequent click event won't trigger close
        setTimeout(() => {
          isDragMoved.current = false;
        }, 100);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        setScale((prev) => Math.min(prev + 0.25, 6));
      } else if (e.key === '-' || e.key === '_') {
        setScale((prev) => {
          const next = Math.max(prev - 0.25, 0.4);
          if (next <= 1) setPosition({ x: 0, y: 0 });
          return next;
        });
      } else if (e.key === '0') {
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setRotation(0);
      } else if (e.key === 'r' || e.key === 'R') {
        setRotation((prev) => (prev + 90) % 360);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Mouse pan handlers on container/image
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only primary mouse button (left click)
    if (e.button !== 0) return;
    
    e.preventDefault();
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    isDragMoved.current = false;
    setIsDragging(true);
  };

  // Double click to toggle zoom
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.3, 6));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.3, 0.4);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Container click handler - only closes if not dragging and scale is 1
  const handleContainerClick = (e: React.MouseEvent) => {
    // If the user just performed a drag gesture, do NOT close
    if (isDragMoved.current) {
      e.stopPropagation();
      return;
    }

    // Only close if clicking directly on the background (not on buttons or while zoomed)
    if (e.target === containerRef.current && scale <= 1) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md select-none animate-in fade-in duration-200"
    >
      {/* Top Bar / Header Controls */}
      <div
        className="absolute top-0 inset-x-0 z-30 px-4 py-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 min-w-0 max-w-[40%] text-white/90">
          <span className="text-sm font-semibold truncate drop-shadow">{title}</span>
        </div>

        {/* Action Buttons & Zoom Bar */}
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-white/10 backdrop-blur-md rounded-xl p-1 border border-white/15 text-white shadow-lg">
            <button
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors active:scale-95 text-white/90 hover:text-white"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-mono font-bold min-w-[50px] text-center text-teal-300">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors active:scale-95 text-white/90 hover:text-white"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="w-[1px] h-4 bg-white/20 mx-1" />
            <button
              onClick={handleReset}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors active:scale-95 text-white/90 hover:text-white"
              title="Reset Zoom (0)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleRotate}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors active:scale-95 text-white/90 hover:text-white"
              title="Putar Gambar 90° (R)"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          {/* External Links */}
          {directDriveView && (
            <a
              href={directDriveView}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-teal-300 rounded-xl text-xs font-semibold backdrop-blur-md border border-white/15 transition-all active:scale-95"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Buka di Drive
            </a>
          )}

          {directDriveDownload && (
            <a
              href={directDriveDownload}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold shadow-lg transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </a>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white bg-white/10 hover:bg-rose-600 rounded-xl border border-white/15 transition-all ml-1 active:scale-95 shadow-lg"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Container with Drag & Zoom */}
      <div
        ref={containerRef}
        className={`relative w-full h-full flex items-center justify-center overflow-hidden ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onClick={handleContainerClick}
        onMouseDown={handleMouseDown}
      >
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            transformOrigin: 'center center',
          }}
          className="flex items-center justify-center max-w-full max-h-full"
          onDoubleClick={handleDoubleClick}
        >
          <img
            src={highResUrl}
            alt={title}
            referrerPolicy="no-referrer"
            draggable={false}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl pointer-events-none"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (driveId && !target.src.includes('googleusercontent.com')) {
                target.src = `https://lh3.googleusercontent.com/d/${driveId}`;
              } else if (driveId && !target.src.includes('/api/drive/view/')) {
                target.src = `/api/drive/view/${driveId}`;
              }
            }}
          />
        </div>
      </div>

      {/* Bottom Hint */}
      <div
        className="absolute bottom-3 inset-x-0 z-20 flex justify-center pointer-events-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3.5 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-[11px] text-slate-300 font-medium flex items-center gap-3 shadow-lg">
          <span className="flex items-center gap-1">
            <Move className="w-3 h-3 text-teal-400" /> Scroll / Drag untuk Zoom & Geser
          </span>
          <span className="opacity-40">•</span>
          <span>Double-click untuk Zoom In/Out</span>
        </div>
      </div>
    </div>
  );
}
