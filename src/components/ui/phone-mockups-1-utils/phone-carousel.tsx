import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { IPhoneFrame } from "./iphone-frame";

export interface ImageItem {
  /** Screenshot layar. Diabaikan bila `content` diisi. */
  src?: string;
  alt: string;
  /** Isi layar kustom (React) sebagai pengganti screenshot. */
  content?: React.ReactNode;
  /** Judul di bawah ponsel aktif. */
  label?: string;
  description?: string;
  /** Dipanggil saat ponsel aktif diklik. */
  onClick?: () => void;
}

export interface PhoneCarouselProps {
  images: ImageItem[];
  initialIndex?: number;
  className?: string;
  onActiveChange?: (index: number) => void;
  /** Ponsel lebih besar & sebaran selebar layar. */
  wide?: boolean;
  /** Bingkai item: ponsel (default) atau kotak dengan bayangan di bawahnya. */
  frame?: "phone" | "box";
}

const SWIPE_THRESHOLD = 40;

export function PhoneCarousel({ images, initialIndex = 0, className, onActiveChange, wide = false, frame = "phone" }: PhoneCarouselProps) {
  const count = images.length;
  const [active, setActive] = useState(() => Math.min(Math.max(initialIndex, 0), Math.max(count - 1, 0)));
  const pointerStartX = useRef<number | null>(null);
  // Cegah klik "tembus" ke ponsel setelah gestur geser
  const didSwipe = useRef(false);

  const goTo = useCallback(
    (index: number) => {
      if (count === 0) return;
      const next = ((index % count) + count) % count;
      setActive(next);
      onActiveChange?.(next);
    },
    [count, onActiveChange]
  );

  useEffect(() => {
    if (active > count - 1) setActive(Math.max(count - 1, 0));
  }, [active, count]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") goTo(active - 1);
    if (e.key === "ArrowRight") goTo(active + 1);
    if (e.key === "Enter") images[active]?.onClick?.();
  };

  if (count === 0) return null;

  // Offset melingkar terpendek supaya kartu di ujung muncul di sisi yang benar
  const offsetOf = (i: number) => {
    let d = i - active;
    if (d > count / 2) d -= count;
    if (d < -count / 2) d += count;
    return d;
  };

  const current = images[active];

  return (
    <div
      className={cn("relative w-full select-none outline-none", className)}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="region"
      aria-roledescription="carousel"
    >
      <div
        className={cn(
          "relative mx-auto w-full touch-pan-y",
          wide ? "max-w-none" : "max-w-5xl",
          frame === "box"
            ? (wide ? "h-[300px] sm:h-[420px]" : "h-[260px] sm:h-[310px]")
            : (wide ? "h-[480px] sm:h-[640px]" : "h-[470px] sm:h-[560px]")
        )}
        onPointerDown={e => { pointerStartX.current = e.clientX; didSwipe.current = false; }}
        onPointerUp={e => {
          if (pointerStartX.current === null) return;
          const dx = e.clientX - pointerStartX.current;
          pointerStartX.current = null;
          if (Math.abs(dx) > SWIPE_THRESHOLD) {
            didSwipe.current = true;
            goTo(active + (dx < 0 ? 1 : -1));
          }
        }}
      >
        {images.map((item, i) => {
          const offset = offsetOf(i);
          const abs = Math.abs(offset);
          const hidden = abs > 2;
          const isActive = offset === 0;
          const screen = item.content ?? (
            <img src={item.src} alt={item.alt} draggable={false} className="h-full w-full object-cover object-top" />
          );
          return (
            <button
              key={`${item.alt}-${i}`}
              type="button"
              aria-label={isActive ? `Buka ${item.label || item.alt}` : `Tampilkan ${item.label || item.alt}`}
              aria-current={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => {
                if (didSwipe.current) return;
                if (isActive) item.onClick?.();
                else goTo(i);
              }}
              className={cn(
                "absolute left-1/2 top-0 cursor-pointer transition-all duration-500 ease-out",
                frame === "box" && wide
                  ? "w-[230px] sm:w-[340px]"
                  : wide ? "w-[210px] sm:w-[285px]" : "w-[200px] sm:w-[250px]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4",
                frame === "box" ? "rounded-[2rem]" : "rounded-[2.6rem]",
                hidden && "pointer-events-none"
              )}
              style={{
                transform: `translateX(calc(-50% + ${offset * (wide ? 95 : 62)}%)) scale(${1 - abs * 0.14})`,
                transformOrigin: "center top",
                zIndex: 10 - abs,
                opacity: hidden ? 0 : 1 - abs * 0.28,
                filter: isActive ? "none" : `saturate(${1 - abs * 0.35})`,
              }}
            >
              {frame === "box" ? (
                <div className="relative">
                  <div
                    className={cn(
                      "relative aspect-square w-full overflow-hidden rounded-[2rem] border border-[#e2e8f0] bg-white transition-transform duration-500",
                      isActive ? "-translate-y-2 shadow-lg" : "shadow-sm"
                    )}
                  >
                    {screen}
                  </div>
                  {/* Bayangan lantai di bawah kotak */}
                  <span
                    className={cn(
                      "pointer-events-none absolute left-1/2 -bottom-7 h-5 -translate-x-1/2 rounded-[50%] bg-[#0f172a] blur-md transition-all duration-500",
                      isActive ? "w-[80%] opacity-25" : "w-[65%] opacity-15"
                    )}
                  />
                </div>
              ) : (
                <IPhoneFrame className={cn(isActive && "shadow-2xl")}>{screen}</IPhoneFrame>
              )}
            </button>
          );
        })}
      </div>

      <div className={cn("flex flex-col items-center gap-3", frame === "box" ? "mt-8 sm:mt-10" : "mt-2")}>
        {(current.label || current.description) && (
          <div className="text-center px-4 min-h-[44px]">
            {current.label && <p className="menu-tab-title text-base sm:text-lg font-black tracking-tight text-foreground">{current.label}</p>}
            {current.description && <p className="menu-tab-subtitle text-xs sm:text-sm font-medium text-[#64748b]">{current.description}</p>}
          </div>
        )}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="rounded-full shadow-xs" onClick={() => goTo(active - 1)} aria-label="Sebelumnya">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-1.5">
            {images.map((item, i) => (
              <button
                key={`dot-${item.alt}-${i}`}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Ke ${item.label || item.alt}`}
                className={cn(
                  "h-2 rounded-full transition-all cursor-pointer",
                  i === active ? "w-6 bg-primary" : "w-2 bg-[#cbd5e1] hover:bg-[#94a3b8]"
                )}
              />
            ))}
          </div>
          <Button variant="outline" size="icon" className="rounded-full shadow-xs" onClick={() => goTo(active + 1)} aria-label="Berikutnya">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
