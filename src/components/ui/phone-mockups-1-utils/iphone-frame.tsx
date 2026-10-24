import React from "react";
import { cn } from "@/lib/utils";

export interface IPhoneFrameProps {
  children?: React.ReactNode;
  className?: string;
  screenClassName?: string;
}

/**
 * Bingkai iPhone versi terang (titanium perak) — bezel tipis, dynamic island kecil.
 * Ukuran mengikuti lebar container; rasio layar 9 : 19.5.
 */
export function IPhoneFrame({ children, className, screenClassName }: IPhoneFrameProps) {
  return (
    <div
      className={cn(
        "relative aspect-[9/19.5] w-full rounded-[2.6rem] p-[7px] shadow-xl",
        "bg-gradient-to-b from-[#f1f5f9] via-[#e2e8f0] to-[#cbd5e1] ring-1 ring-[#cbd5e1]",
        className
      )}
    >
      {/* Tombol samping */}
      <span className="absolute -left-[3px] top-[22%] h-8 w-[3px] rounded-l bg-[#cbd5e1]" />
      <span className="absolute -left-[3px] top-[31%] h-12 w-[3px] rounded-l bg-[#cbd5e1]" />
      <span className="absolute -right-[3px] top-[27%] h-16 w-[3px] rounded-r bg-[#cbd5e1]" />

      <div
        className={cn(
          "relative h-full w-full overflow-hidden rounded-[2.2rem] bg-white ring-1 ring-[#e2e8f0]",
          screenClassName
        )}
      >
        {/* Dynamic Island */}
        <span className="pointer-events-none absolute left-1/2 top-2 z-20 h-[18px] w-[76px] -translate-x-1/2 rounded-full bg-[#0f172a]" />
        {children}
      </div>
    </div>
  );
}
