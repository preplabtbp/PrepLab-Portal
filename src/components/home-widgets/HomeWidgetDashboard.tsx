import React, { useState, useEffect } from 'react';
import { 
  Plus, Settings2, RotateCcw, ChevronLeft, ChevronRight, 
  Maximize2, Minimize2, X, SlidersHorizontal, Check, Sparkles 
} from 'lucide-react';
import { 
  WidgetId, WidgetSize, WidgetItemConfig, 
  DEFAULT_WIDGET_CONFIGS, WIDGET_CATALOG 
} from './types';
import { ClockWidget } from './ClockWidget';
import { CalendarWidget } from './CalendarWidget';
import { WeatherSiteWidget } from './WeatherSiteWidget';
import { StickyNotesWidget } from './StickyNotesWidget';
import { GamificationStreakWidget } from './GamificationStreakWidget';
import { SudutSantaiWidget } from './SudutSantaiWidget';
import { KantinMenuWidget } from './KantinMenuWidget';
import { Avatar3DWidget } from './Avatar3DWidget';
import { WidgetCatalogModal } from './WidgetCatalogModal';

interface HomeWidgetDashboardProps {
  userNik?: string;
}

export const HomeWidgetDashboard: React.FC<HomeWidgetDashboardProps> = ({ userNik = 'default' }) => {
  const storageKey = `preplab_home_widgets_v2_${userNik}`;

  const [configs, setConfigs] = useState<WidgetItemConfig[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults in case new widgets were added
        const existingIds = new Set(parsed.map((p: any) => p.id));
        const missing = DEFAULT_WIDGET_CONFIGS.filter(d => !existingIds.has(d.id));
        return [...parsed, ...missing];
      }
    } catch {}
    return DEFAULT_WIDGET_CONFIGS;
  });

  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [showCatalogModal, setShowCatalogModal] = useState<boolean>(false);

  // Enabled widgets sorted by order
  const enabledWidgets = configs
    .filter((c) => c.enabled)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  useEffect(() => {
    if (enabledWidgets.length === 0 && isEditMode) {
      setIsEditMode(false);
    }
  }, [enabledWidgets.length, isEditMode]);

  // Save to localStorage whenever configs change
  const saveConfigs = (newConfigs: WidgetItemConfig[]) => {
    setConfigs(newConfigs);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newConfigs));
    } catch {}
  };

  const handleToggleWidget = (id: WidgetId, enabled: boolean) => {
    const updated = configs.map((c) => {
      if (c.id === id) {
        return { ...c, enabled };
      }
      return c;
    });
    saveConfigs(updated);
  };

  const handleChangeSize = (id: WidgetId, size: WidgetSize) => {
    const updated = configs.map((c) => {
      if (c.id === id) {
        return { ...c, size };
      }
      return c;
    });
    saveConfigs(updated);
  };

  const handleUpdateWidgetSettings = (id: WidgetId, newSettings: any) => {
    const updated = configs.map((c) => {
      if (c.id === id) {
        return { ...c, settings: { ...c.settings, ...newSettings } };
      }
      return c;
    });
    saveConfigs(updated);
  };

  const handleMoveWidget = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= enabledWidgets.length) return;

    // Swap positions among enabled widgets
    const newEnabled = [...enabledWidgets];
    const temp = newEnabled[index];
    newEnabled[index] = newEnabled[targetIndex];
    newEnabled[targetIndex] = temp;

    // Reconstruct full list with preserved disabled widgets
    const disabledWidgets = configs.filter((c) => !c.enabled);
    const reordered = newEnabled.map((item, idx) => ({ ...item, order: idx }));
    saveConfigs([...reordered, ...disabledWidgets]);
  };

  const handleResetLayout = () => {
    if (confirm('Kembalikan susunan widget ke tampilan awal rekomendasi?')) {
      saveConfigs(DEFAULT_WIDGET_CONFIGS);
      setIsEditMode(false);
    }
  };


  // Determine span class
  const getColSpanClass = (size: WidgetSize) => {
    switch (size) {
      case '1x':
        return 'col-span-1';
      case '2x':
        return 'col-span-1 sm:col-span-2';
      case 'full':
        return 'col-span-1 sm:col-span-2 lg:col-span-4';
      default:
        return 'col-span-1';
    }
  };

  // Render individual widget content
  const renderWidgetContent = (item: WidgetItemConfig) => {
    switch (item.id) {
      case 'clock':
        return (
          <ClockWidget
            size={item.size}
            settings={item.settings as any}
            onUpdateSettings={(s) => handleUpdateWidgetSettings('clock', s)}
            isEditMode={isEditMode}
          />
        );
      case 'calendar':
        return (
          <CalendarWidget
            size={item.size}
            isEditMode={isEditMode}
          />
        );
      case 'weather':
        return <WeatherSiteWidget size={item.size} />;
      case 'notes':
        return (
          <StickyNotesWidget
            size={item.size}
            settings={item.settings as any}
            onUpdateSettings={(s) => handleUpdateWidgetSettings('notes', s)}
          />
        );
      case 'streak':
        return <GamificationStreakWidget size={item.size} />;
      case 'trivia_quote':
        return <SudutSantaiWidget size={item.size} />;
      case 'canteen':
        return <KantinMenuWidget size={item.size} />;
      case 'avatar_3d':
        return <Avatar3DWidget size={item.size} userNik={userNik} />;
      default:
        return null;
    }
  };

  return (
    <section id="home-widgets-container" className="w-full space-y-3.5 pt-2">
      {/* Dashboard Section Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
          <div>
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--text-main)] font-display flex items-center gap-1.5">
              <span>Ruang Personalisasi &amp; Kenyamanan</span>
              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 font-sans normal-case">
                {enabledWidgets.length} Widget Aktif
              </span>
            </h3>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Edit Mode Toggle */}
          {enabledWidgets.length > 0 && (
            <button
              type="button"
              onClick={() => setIsEditMode(!isEditMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isEditMode
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-main)]'
              }`}
            >
              {isEditMode ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Selesai Atur</span>
                </>
              ) : (
                <>
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Atur Posisi &amp; Ukuran</span>
                </>
              )}
            </button>
          )}

          {/* Add Widget Button */}
          <button
            id="home-add-widget-btn"
            type="button"
            onClick={() => setShowCatalogModal(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Widget</span>
          </button>
        </div>
      </div>

      {/* Grid Container */}
      {enabledWidgets.length === 0 ? (
        <div 
          className="p-8 text-center rounded-3xl border border-dashed border-[var(--border-main)] space-y-3"
          style={{ backgroundColor: 'var(--card-bg, #FFFFFF)' }}
        >
          <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-500/15 text-teal-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-[var(--text-main)]">
              Belum ada widget aktif di beranda
            </h4>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Tambahkan jam, kalender, catatan pribadi, atau cuaca site untuk mempersonalisasi portal Anda.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCatalogModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 text-white inline-flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Buka Katalog Widget</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {enabledWidgets.map((item, index) => {
            const catalogItem = WIDGET_CATALOG.find((w) => w.id === item.id);
            const canResize = (catalogItem?.availableSizes?.length || 0) > 1;

            return (
              <div
                key={item.id}
                className={`${getColSpanClass(item.size)} rounded-3xl p-4 sm:p-5 border transition-all duration-200 relative overflow-hidden group shadow-2xs hover:shadow-xs flex flex-col justify-between`}
                style={{
                  backgroundColor: 'var(--card-bg, #FFFFFF)',
                  borderColor: isEditMode 
                    ? 'rgba(245, 158, 11, 0.6)' 
                    : 'var(--border-main, #E2E8F0)'
                }}
              >
                {/* Edit Mode Overlay Handles */}
                {isEditMode && (
                  <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-white/95 dark:bg-slate-900/95 p-1 rounded-xl shadow-md border border-[var(--border-main)] animate-in fade-in">
                    {/* Move Left */}
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveWidget(index, 'left')}
                      className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Geser Kiri / Atas"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    {/* Move Right */}
                    <button
                      type="button"
                      disabled={index === enabledWidgets.length - 1}
                      onClick={() => handleMoveWidget(index, 'right')}
                      className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30 disabled:pointer-events-none hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Geser Kanan / Bawah"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {/* Cycle Size Button */}
                    {canResize && (
                      <button
                        type="button"
                        onClick={() => {
                          const sizes = catalogItem?.availableSizes || ['1x', '2x'];
                          const curIdx = sizes.indexOf(item.size);
                          const nextSize = sizes[(curIdx + 1) % sizes.length];
                          handleChangeSize(item.id, nextSize);
                        }}
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                        title="Ubah Ukuran (1x / 2x / Full)"
                      >
                        {item.size}
                      </button>
                    )}

                    {/* Remove Widget */}
                    <button
                      type="button"
                      onClick={() => handleToggleWidget(item.id, false)}
                      className="p-1 rounded-md text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      title="Sembunyikan Widget"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Actual Widget Content */}
                <div className="w-full h-full flex flex-col justify-between">
                  {renderWidgetContent(item)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Widget Catalog Modal */}
      <WidgetCatalogModal
        isOpen={showCatalogModal}
        onClose={() => setShowCatalogModal(false)}
        configs={configs}
        onToggleWidget={handleToggleWidget}
        onChangeSize={handleChangeSize}
        onResetLayout={handleResetLayout}
      />
    </section>
  );
};
