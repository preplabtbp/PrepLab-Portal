import React from 'react';

interface PageHeaderProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, icon, children }: PageHeaderProps) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 sm:p-8 shadow-lg border border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none transform translate-x-4 -translate-y-4">
        <div className="w-40 h-40 sm:w-48 sm:h-48 text-white [&>svg]:w-full [&>svg]:h-full">
          {icon}
        </div>
      </div>
      <div className="relative z-10 flex-1">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-white mb-2">
          {title}
        </h1>
        <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-lg">
          {description}
        </p>
      </div>
      {children && (
        <div className="relative z-10 shrink-0 self-start sm:self-auto">
          {children}
        </div>
      )}
    </div>
  );
}
