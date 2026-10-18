import React from 'react';

interface PageHeaderProps {
  title: React.ReactNode;
  description: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, icon, children }: PageHeaderProps) {
  return (
    <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-7 shadow-lg border border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-6 z-20">
      <div className="absolute inset-0 overflow-hidden rounded-xl sm:rounded-2xl pointer-events-none">
        <div className="absolute top-0 right-0 p-3 sm:p-4 opacity-10 transform translate-x-4 -translate-y-4">
          <div className="w-24 h-24 sm:w-48 sm:h-48 text-white [&>svg]:w-full [&>svg]:h-full">
            {icon}
          </div>
        </div>
      </div>
      <div className="relative z-10 flex-1">
        <h1 className="text-xl sm:text-3xl font-display font-bold text-white mb-1 sm:mb-2 leading-tight">
          {title}
        </h1>
        <p className="text-slate-300 text-xs sm:text-base leading-relaxed max-w-lg">
          {description}
        </p>
      </div>
      {children && (
        <div className="relative z-30 shrink-0 self-start sm:self-auto flex flex-wrap items-center gap-1.5 sm:gap-2">
          {children}
        </div>
      )}
    </div>
  );
}
