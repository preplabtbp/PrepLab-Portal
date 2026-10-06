import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, 
  X, 
  Clock, 
  Sparkles, 
  ArrowRight,
  Command,
  CornerDownLeft
} from 'lucide-react';
import { ALL_PORTAL_MODULES, PortalModuleItem } from './ModuleSearchBar';

interface HeaderModuleSearchBarProps {
  onNav: (tab: string) => void;
  onOpenKta?: () => void;
  onOpenP5m?: () => void;
  inspectorRole?: string | null;
}

export function HeaderModuleSearchBar({
  onNav,
  onOpenKta,
  onOpenP5m,
  inspectorRole
}: HeaderModuleSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('preplab_recent_module_searches');
      return saved ? JSON.parse(saved) : ['P2H', 'Log Book', 'Inspeksi', 'KTA'];
    } catch (e) {
      return ['P2H', 'Log Book', 'Inspeksi', 'KTA'];
    }
  });

  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Global Shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (window.innerWidth < 640) {
          setIsMobileModalOpen(true);
          setTimeout(() => mobileInputRef.current?.focus(), 120);
        } else {
          desktopInputRef.current?.focus();
          setIsOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen to open-header-module-search from homepage mobile search bar
  useEffect(() => {
    const handleOpen = () => {
      setIsMobileModalOpen(true);
      setTimeout(() => mobileInputRef.current?.focus(), 120);
    };
    window.addEventListener('open-header-module-search', handleOpen);
    return () => window.removeEventListener('open-header-module-search', handleOpen);
  }, []);

  // Save recent searches
  const addRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches(prev => {
      const updated = [trimmed, ...prev.filter(s => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 5);
      try {
        localStorage.setItem('preplab_recent_module_searches', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Filter modules
  const filteredModules = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Default recommend high-frequency modules
      return ALL_PORTAL_MODULES.slice(0, 6);
    }
    return ALL_PORTAL_MODULES.filter(m => {
      const titleMatch = m.title.toLowerCase().includes(q);
      const descMatch = m.desc.toLowerCase().includes(q);
      const tagMatch = m.tags.some(t => t.toLowerCase().includes(q));
      const catMatch = m.category.toLowerCase().includes(q);
      return titleMatch || descMatch || tagMatch || catMatch;
    });
  }, [query]);

  // Handle module selection
  const handleSelectModule = (module: PortalModuleItem) => {
    addRecentSearch(module.title);
    setIsOpen(false);
    setIsMobileModalOpen(false);
    setQuery('');

    if (module.actionType === 'kta') {
      if (onOpenKta) onOpenKta();
      else onNav('weekly-inspection');
    } else if (module.actionType === 'p5m') {
      if (onOpenP5m) onOpenP5m();
      else onNav('p5m');
    } else {
      onNav(module.target);
    }
  };

  // Keyboard Navigation inside search list
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (filteredModules.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + (filteredModules.length || 1)) % (filteredModules.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredModules[selectedIndex]) {
        handleSelectModule(filteredModules[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setIsMobileModalOpen(false);
    }
  };

  // Close desktop dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          desktopInputRef.current && !desktopInputRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div id="header-module-search" className="relative flex-1 max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-lg mx-2 sm:mx-4">
      {/* Desktop Search Bar (Centered in Header) */}
      <div className="hidden sm:flex items-center relative w-full">
        <div className="relative w-full">
          <input
            ref={desktopInputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleInputKeyDown}
            placeholder="Cari modul operasional, logbook, tiket..."
            className="w-full pl-9 pr-16 py-1.5 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all shadow-2xs"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />

          {/* Right Action / Shortcut Pill */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  desktopInputRef.current?.focus();
                }}
                className="pointer-events-auto p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            ) : (
              <span className="hidden md:inline-flex items-center gap-0.5 text-[10px] font-mono font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded shadow-2xs">
                Ctrl K
              </span>
            )}
          </div>
        </div>

        {/* Desktop Dropdown Palette */}
        {isOpen && (
          <div 
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden z-[100] animate-in fade-in duration-100"
          >
            {/* Recent Searches Pills */}
            {!query && recentSearches.length > 0 && (
              <div className="px-3.5 pt-2.5 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1 mr-1">
                  <Clock className="w-3 h-3" /> Riwayat:
                </span>
                {recentSearches.map((term, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => {
                      setQuery(term);
                      desktopInputRef.current?.focus();
                    }}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            )}

            {/* Modules List */}
            <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5">
              {filteredModules.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 italic">
                  Modul "{query}" tidak ditemukan. Coba ketik kata kunci lain.
                </div>
              ) : (
                filteredModules.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectModule(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-1.5 rounded-lg border shrink-0 ${item.iconBg} ${item.iconColor}`}>
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate leading-tight">{item.title}</p>
                          <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 pl-2">
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/60 dark:border-slate-700">
                          {item.category}
                        </span>
                        {isSelected && <CornerDownLeft className="w-3 h-3 text-slate-400" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Dropdown Footer */}
            <div className="px-3 py-1.5 bg-slate-50 dark:bg-[#151515] border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
              <span>Gunakan ↑ ↓ untuk navigasi, Enter untuk memilih</span>
              <span className="font-mono text-[9px]">ESC tutup</span>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Search Button & Modal Trigger */}
      <div className="sm:hidden flex items-center justify-center">
        <button
          type="button"
          onClick={() => {
            setIsMobileModalOpen(true);
            setTimeout(() => mobileInputRef.current?.focus(), 100);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium active:scale-95 transition-transform"
          title="Cari modul operasional"
        >
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[11px]">Cari Modul</span>
        </button>
      </div>

      {/* Mobile Search Modal Drawer (Portalled to document.body to prevent clipping by header backdrop-blur) */}
      {typeof document !== 'undefined' && createPortal(
        isMobileModalOpen ? (
          <div 
            onClick={() => {
              setIsMobileModalOpen(false);
              setQuery('');
            }}
            className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-xs flex flex-col justify-start p-3 pt-6 sm:hidden animate-in fade-in duration-150"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[88vh] w-full"
            >
              {/* Header Input */}
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2.5 shrink-0">
                <Search className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <input
                  ref={mobileInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari modul, inspeksi, logbook, labnote..."
                  className="w-full text-xs bg-transparent outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 font-medium"
                  autoFocus
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      mobileInputRef.current?.focus();
                    }}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileModalOpen(false);
                    setQuery('');
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                >
                  Tutup
                </button>
              </div>

              {/* Quick Suggestion Pills */}
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto shrink-0">
                <span className="text-[10px] font-semibold text-slate-400 shrink-0">Populer:</span>
                {['P2H', 'Logbook', 'Labnote', 'Inspeksi', 'KTA', 'WO', 'P5M', 'Tutorial'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setQuery(tag);
                      mobileInputRef.current?.focus();
                    }}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-600 dark:text-slate-300 hover:text-teal-600 transition-colors shrink-0"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Results List */}
              <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1 divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredModules.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400 space-y-2 px-4">
                    <Search className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="font-semibold text-slate-700 dark:text-slate-200">Modul tidak ditemukan</p>
                    <p className="text-[11px] text-slate-400">
                      Tidak ditemukan hasil untuk "{query}". Coba kata kunci lain seperti "P2H", "Logbook", atau "Labnote".
                    </p>
                  </div>
                ) : (
                  filteredModules.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectModule(item)}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer active:bg-slate-100"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-2 rounded-xl border shrink-0 ${item.iconBg} ${item.iconColor}`}>
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{item.title}</p>
                          <p className="text-[10px] text-slate-400 truncate leading-snug">{item.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {item.category}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null,
        document.body
      )}
    </div>
  );
}
