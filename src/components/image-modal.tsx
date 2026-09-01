import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, RotateCcw, Download, ExternalLink, Move } from 'lucide-react';

export interface ImageModalProps {
  imageUrl: string | null;
  isOpen?: boolean;
  title?: string;
  driveViewUrl?: string;
  driveDownloadUrl?: string;
  onClose: () => void;
}

export function ImageModal({
  imageUrl,
  isOpen,
  title = 'Image Preview',
  driveViewUrl,
  driveDownloadUrl,
  onClose,
}: ImageModalProps) {
  if (!imageUrl || (isOpen !== undefined && !isOpen)) return null;

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDragMoved = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const mouseDownPosRef = useRef({ x: 0, y: 0 });

  // Touch gesture state refs
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartScaleRef = useRef<number>(1);
  const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTapTimeRef = useRef<number>(0);

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

  // Global mousemove and mouseup listeners for seamless desktop dragging
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
    if (e.button !== 0) return;
    
    e.preventDefault();
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    isDragMoved.current = false;
    setIsDragging(true);
  };

  // Touch Handlers for Mobile (Pinch to Zoom, Touch Drag & Pan, Double Tap)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const now = Date.now();

      // Detect double tap
      if (now - lastTapTimeRef.current < 300) {
        if (scale > 1) {
          setScale(1);
          setPosition({ x: 0, y: 0 });
        } else {
          setScale(2.5);
        }
        lastTapTimeRef.current = 0;
        return;
      }
      lastTapTimeRef.current = now;

      mouseDownPosRef.current = { x: touch.clientX, y: touch.clientY };
      dragStartRef.current = { x: touch.clientX - position.x, y: touch.clientY - position.y };
      isDragMoved.current = false;
      setIsDragging(true);
      touchStartDistRef.current = null;
    } else if (e.touches.length === 2) {
      // 2 fingers pinch start
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchStartDistRef.current = dist;
      touchStartScaleRef.current = scale;
      touchStartPosRef.current = { ...position };
      touchStartCenterRef.current = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && touchStartDistRef.current === null) {
      // Single finger drag / pan
      const touch = e.touches[0];
      const dist = Math.hypot(touch.clientX - mouseDownPosRef.current.x, touch.clientY - mouseDownPosRef.current.y);
      if (dist > 4) {
        isDragMoved.current = true;
      }
      setPosition({
        x: touch.clientX - dragStartRef.current.x,
        y: touch.clientY - dragStartRef.current.y,
      });
    } else if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      // Pinch to Zoom & Pan simultaneously
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const ratio = currentDist / touchStartDistRef.current;
      const nextScale = Math.min(Math.max(touchStartScaleRef.current * ratio, 0.4), 6);
      setScale(nextScale);
      isDragMoved.current = true;

      // Track midpoint movement for natural two-finger dragging
      const currentCenter = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };
      const deltaX = currentCenter.x - touchStartCenterRef.current.x;
      const deltaY = currentCenter.y - touchStartCenterRef.current.y;

      setPosition({
        x: touchStartPosRef.current.x + deltaX,
        y: touchStartPosRef.current.y + deltaY,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsDragging(false);
      touchStartDistRef.current = null;
      if (scale <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      setTimeout(() => {
        isDragMoved.current = false;
      }, 100);
    } else if (e.touches.length === 1) {
      // Switched from 2 fingers back to 1 finger
      const touch = e.touches[0];
      mouseDownPosRef.current = { x: touch.clientX, y: touch.clientY };
      dragStartRef.current = { x: touch.clientX - position.x, y: touch.clientY - position.y };
      touchStartDistRef.current = null;
    }
  };

  // Double click to toggle zoom on desktop
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
    if (isDragMoved.current) {
      e.stopPropagation();
      return;
    }

    if (e.target === containerRef.current && scale <= 1) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md select-none animate-in fade-in duration-200 touch-none"
      style={{ touchAction: 'none' }}
    >
      {/* Top Bar / Header Controls */}
      <div
        className="absolute top-0 inset-x-0 z-30 px-3 md:px-4 py-2.5 md:py-3 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between gap-2 md:gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 min-w-0 max-w-[35%] md:max-w-[40%] text-white/90">
          <span className="text-xs md:text-sm font-semibold truncate drop-shadow">{title}</span>
        </div>

        {/* Action Buttons & Zoom Bar */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-white/10 backdrop-blur-md rounded-xl p-0.5 md:p-1 border border-white/15 text-white shadow-lg">
            <button
              onClick={handleZoomOut}
              className="p-1.5 md:p-2 hover:bg-white/20 rounded-lg transition-colors active:scale-95 text-white/90 hover:text-white touch-manipulation"
              title="Zoom Out (-)"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
            <span className="px-1.5 md:px-2 text-[11px] md:text-xs font-mono font-bold min-w-[42px] md:min-w-[50px] text-center text-teal-300">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 md:p-2 hover:bg-white/20 rounded-lg transition-colors active:scale-95 text-white/90 hover:text-white touch-manipulation"
              title="Zoom In (+)"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
            <div className="w-[1px] h-3.5 md:h-4 bg-white/20 mx-0.5 md:mx-1" />
            <button
              onClick={handleReset}
              className="p-1.5 md:p-2 hover:bg-white/20 rounded-lg transition-colors active:scale-95 text-white/90 hover:text-white touch-manipulation"
              title="Reset Zoom (0)"
              aria-label="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </button>
            <button
              onClick={handleRotate}
              className="p-1.5 md:p-2 hover:bg-white/20 rounded-lg transition-colors active:scale-95 text-white/90 hover:text-white touch-manipulation"
              title="Putar Gambar 90° (R)"
              aria-label="Rotate Image"
            >
              <RotateCw className="w-3.5 h-3.5 md:w-4 md:h-4" />
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
            className="p-1.5 md:p-2 text-white/80 hover:text-white bg-white/10 hover:bg-rose-600 rounded-xl border border-white/15 transition-all ml-0.5 md:ml-1 active:scale-95 shadow-lg touch-manipulation"
            title="Tutup (Esc)"
            aria-label="Tutup"
          >
            <X className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Container with Drag, Pinch Zoom & Pan */}
      <div
        ref={containerRef}
        className={`relative w-full h-full flex items-center justify-center overflow-hidden touch-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{ touchAction: 'none' }}
        onClick={handleContainerClick}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            transformOrigin: 'center center',
            touchAction: 'none',
          }}
          className="flex items-center justify-center max-w-full max-h-full touch-none"
          onDoubleClick={handleDoubleClick}
        >
          <img
            src={highResUrl}
            alt={title}
            referrerPolicy="no-referrer"
            draggable={false}
            className="max-w-[92vw] max-h-[82vh] object-contain rounded-lg shadow-2xl pointer-events-none select-none"
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
        className="absolute bottom-3 inset-x-0 z-20 flex justify-center pointer-events-none px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3.5 py-1.5 bg-black/70 backdrop-blur-md rounded-full border border-white/10 text-[10px] md:text-[11px] text-slate-300 font-medium flex items-center gap-2 md:gap-3 shadow-lg text-center">
          <span className="flex items-center gap-1">
            <Move className="w-3 h-3 text-teal-400" /> Pinch / Drag untuk Zoom & Geser
          </span>
          <span className="opacity-40">•</span>
          <span>Double-tap untuk Zoom</span>
        </div>
      </div>
    </div>
  );
}
