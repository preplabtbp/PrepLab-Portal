import React from 'react';
import { 
  X, Plus, Check, Clock, Calendar, SunMedium, 
  StickyNote, Flame, Sparkles, UtensilsCrossed, 
  RotateCcw, LayoutGrid 
} from 'lucide-react';
import { WIDGET_CATALOG, WidgetItemConfig, WidgetSize, WidgetId } from './types';

interface WidgetCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  configs: WidgetItemConfig[];
  onToggleWidget: (id: WidgetId, enabled: boolean) => void;
  onChangeSize: (id: WidgetId, size: WidgetSize) => void;
  onResetLayout: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Clock: <Clock className="w-5 h-5 text-teal-500" />,
  Calendar: <Calendar className="w-5 h-5 text-indigo-500" />,
  SunMedium: <SunMedium className="w-5 h-5 text-amber-500" />,
  StickyNote: <StickyNote className="w-5 h-5 text-amber-500" />,
  Flame: <Flame className="w-5 h-5 text-orange-500" />,
  Sparkles: <Sparkles className="w-5 h-5 text-pink-500" />,
  UtensilsCrossed: <UtensilsCrossed className="w-5 h-5 text-emerald-500" />
};

export const WidgetCatalogModal: React.FC<WidgetCatalogModalProps> = ({
  isOpen,
  onClose,
  configs,
  onToggleWidget,
  onChangeSize,
  onResetLayout
}) => {
  if (!isOpen) return null;

  const getConfig = (id: WidgetId) => configs.find((c) => c.id === id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl max-h-[85vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        style={{
          backgroundColor: 'var(--card-bg, #FFFFFF)',
          borderColor: 'var(--border-main, #E2E8F0)'
        }}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--border-main)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-[var(--text-main)] font-display">
                Katalog Widget Dashboard
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Pilih widget yang ingin Anda tampilkan dan atur ukuran layoutnya.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Catalog List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {WIDGET_CATALOG.map((item) => {
            const currentCfg = getConfig(item.id);
            const isEnabled = !!currentCfg?.enabled;
            const currentSize = currentCfg?.size || item.defaultSize;

            return (
              <div
                key={item.id}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                  isEnabled
                    ? 'bg-white dark:bg-slate-800/80 border-teal-500/30 shadow-xs'
                    : 'bg-slate-50/60 dark:bg-slate-900/40 border-[var(--border-main)] opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-[var(--border-main)]/50">
                      {ICON_MAP[item.icon] || <LayoutGrid className="w-5 h-5 text-teal-500" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-[var(--text-main)]">
                          {item.title}
                        </h4>
                        <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-700/60 text-[var(--text-muted)]">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleWidget(item.id, !isEnabled)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                        isEnabled
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-slate-200 dark:bg-slate-700 text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      {isEnabled ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Aktif</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Size selector if enabled */}
                {isEnabled && item.availableSizes.length > 1 && (
                  <div className="mt-3 pt-2.5 border-t border-[var(--border-main)]/50 flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted)] font-medium">Ukuran Widget:</span>
                    <div className="flex items-center gap-1.5">
                      {item.availableSizes.map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => onChangeSize(item.id, sz)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                            currentSize === sz
                              ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/40'
                              : 'bg-slate-100 dark:bg-slate-800 text-[var(--text-muted)] hover:text-[var(--text-main)]'
                          }`}
                        >
                          {sz === '1x' ? '1 Kolom (1x)' : sz === '2x' ? '2 Kolom (2x)' : 'Penuh (Full)'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-main)] flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onResetLayout}
            className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-rose-500 transition-colors font-medium px-2 py-1 rounded-lg"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset ke Default</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
