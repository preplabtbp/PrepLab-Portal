import React from "react";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

export interface DisplayCardProps {
  className?: string;
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  date?: string;
  iconClassName?: string;
  titleClassName?: string;
  onClick?: () => void;
}

export function DisplayCard({
  className,
  icon = <Sparkles className="size-5 text-teal-600" />,
  title = "Featured",
  description = "Discover amazing content",
  date = "Just now",
  iconClassName = "text-teal-600",
  titleClassName = "text-teal-800",
  onClick,
}: DisplayCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative flex h-44 sm:h-48 w-[25rem] sm:w-[32rem] -skew-y-[7deg] select-none flex-col justify-between rounded-3xl border-2 border-slate-200/90 bg-white/95 backdrop-blur-md px-6 py-5 sm:px-7 sm:py-5 shadow-md transition-all duration-700 after:absolute after:-right-1 after:top-[-5%] after:h-[110%] after:w-[24rem] after:bg-gradient-to-l after:from-slate-50/90 after:to-transparent after:content-[''] hover:border-teal-500/70 hover:shadow-xl hover:bg-white [&>*]:flex [&>*]:items-center [&>*]:gap-3 cursor-pointer text-slate-800",
        className
      )}
    >
      <div>
        <span className={cn("relative inline-block rounded-2xl bg-slate-100 p-2.5 sm:p-3 border border-slate-200/80 shadow-2xs", iconClassName)}>
          {icon}
        </span>
        <p className={cn("text-lg sm:text-xl font-black text-slate-900 tracking-tight", titleClassName)}>{title}</p>
      </div>
      <p className="whitespace-nowrap text-sm sm:text-base font-semibold text-slate-700 line-clamp-1">{description}</p>
      <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-500 pt-1 border-t border-slate-100">
        <span>{date}</span>
        <span className="text-[11px] font-bold text-teal-600 group-hover:translate-x-1 transition-transform">Klik untuk Buka →</span>
      </div>
    </div>
  );
}

// Versi HP: kartu datar selebar layar (tumpukan 3D bergantung pada hover & terlalu lebar untuk layar sentuh)
function DisplayCardMobile({
  icon = <Sparkles className="size-5 text-teal-600" />,
  title = "Featured",
  description = "Discover amazing content",
  date = "Just now",
  iconClassName = "text-teal-600",
  titleClassName = "text-teal-800",
  onClick,
}: DisplayCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md px-4 py-3.5 text-left shadow-md active:scale-[0.98] active:border-teal-500/70 transition-all cursor-pointer"
    >
      <span className={cn("shrink-0 rounded-xl bg-slate-100 p-2.5 border border-slate-200/80 shadow-2xs", iconClassName)}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-base font-black text-slate-900 tracking-tight leading-tight", titleClassName)}>{title}</span>
        <span className="block text-xs font-semibold text-slate-700 leading-snug mt-0.5 line-clamp-2">{description}</span>
        <span className="block text-[11px] font-semibold text-slate-500 mt-1 truncate">{date}</span>
      </span>
      <span className="shrink-0 text-teal-600 text-lg font-bold">›</span>
    </button>
  );
}

export interface DisplayCardsProps {
  cards?: DisplayCardProps[];
  className?: string;
}

export default function DisplayCards({ cards, className }: DisplayCardsProps) {
  const defaultPositions = [
    "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-3xl before:outline-slate-200 before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-white/40 grayscale-[35%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
    "[grid-area:stack] translate-x-10 sm:translate-x-18 translate-y-9 sm:translate-y-13 hover:translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-3xl before:outline-slate-200 before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-white/40 grayscale-[35%] hover:before:opacity-0 before:transition-opacity before:duration-700 hover:grayscale-0 before:left-0 before:top-0",
    "[grid-area:stack] translate-x-20 sm:translate-x-36 translate-y-18 sm:translate-y-26 hover:translate-y-14",
  ];

  const defaultCards: DisplayCardProps[] = [
    {
      className: defaultPositions[0],
    },
    {
      className: defaultPositions[1],
    },
    {
      className: defaultPositions[2],
    },
  ];

  const displayCards = cards || defaultCards;

  return (
    <>
      {/* HP: daftar kartu vertikal */}
      <div className="sm:hidden w-full max-w-md mx-auto flex flex-col gap-3 animate-in fade-in-0 duration-500">
        {displayCards.map(({ className: _stack, ...cardProps }, index) => (
          <DisplayCardMobile key={index} {...cardProps} />
        ))}
      </div>

      {/* Tablet & desktop: tumpukan kartu 3D */}
      <div className={cn("hidden sm:grid [grid-template-areas:'stack'] place-items-center opacity-100 animate-in fade-in-0 duration-700 min-h-[380px] sm:min-h-[440px] pt-4 pb-16 sm:pb-24 px-4 overflow-visible", className)}>
        {displayCards.map((cardProps, index) => {
          const hasStackClass = cardProps.className && cardProps.className.includes("[grid-area:stack]");
          const stackClass = hasStackClass ? "" : defaultPositions[index % defaultPositions.length];
          return (
            <DisplayCard
              key={index}
              {...cardProps}
              className={cn(stackClass, cardProps.className)}
            />
          );
        })}
      </div>
    </>
  );
}
