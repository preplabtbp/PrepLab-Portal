import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowUpRight, 
  ExternalLink, 
  Copy, 
  Star, 
  Trash2, 
  CopyPlus, 
  FileText,
  Clock,
  Sparkles,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner';

export const isPostFavorite = (id: string | number): boolean => {
  try {
    const raw = localStorage.getItem('preplab_labnote_favorites') || '[]';
    const favs: string[] = JSON.parse(raw);
    return favs.includes(String(id));
  } catch {
    return false;
  }
};

export const togglePostFavorite = (id: string | number, title: string): boolean => {
  try {
    const raw = localStorage.getItem('preplab_labnote_favorites') || '[]';
    let favs: string[] = JSON.parse(raw);
    const strId = String(id);
    let nextState = false;
    if (favs.includes(strId)) {
      favs = favs.filter(x => x !== strId);
      nextState = false;
      toast.info(`"${title}" dihapus dari Favorit`);
    } else {
      favs.push(strId);
      nextState = true;
      toast.success(`"${title}" ditambahkan ke Favorit ⭐`);
    }
    localStorage.setItem('preplab_labnote_favorites', JSON.stringify(favs));
    return nextState;
  } catch {
    return false;
  }
};

export interface NotionContextMenuData {
  x: number;
  y: number;
  title: string;
  icon?: string;
  post?: any;
  linkUrl?: string;
  isLogbook?: boolean;
  sectionName?: string;
  onOpen?: () => void;
  onOpenInNewNotionTab?: () => void;
  onOpenInNewBrowserTab?: () => void;
  onCopyLink?: () => void;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
  onDuplicate?: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
  onCloseTab?: () => void;
  onCloseOtherTabs?: () => void;
  isTabContext?: boolean;
}

interface NotionContextMenuProps {
  data: NotionContextMenuData | null;
  onClose: () => void;
}

export function NotionContextMenu({ data, onClose }: NotionContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleScroll = () => {
      onClose();
    };

    window.addEventListener('mousedown', handleOutsideClick, true);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('mousedown', handleOutsideClick, true);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [data, onClose]);

  if (!data) return null;

  // Calculate smart bounds to prevent overflowing the screen
  const menuWidth = 250;
  const menuHeight = data.isTabContext ? 220 : 310;
  const posX = Math.max(12, Math.min(data.x, window.innerWidth - menuWidth - 16));
  const posY = Math.max(12, Math.min(data.y, window.innerHeight - menuHeight - 16));

  return createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: `${posX}px`,
        top: `${posY}px`,
        zIndex: 99999
      }}
      className="w-[250px] bg-white dark:bg-[#1f1f1f] text-slate-700 dark:text-slate-200 rounded-xl shadow-2xl border border-slate-200/90 dark:border-slate-800 py-1.5 backdrop-blur-md select-none animate-in fade-in zoom-in-95 duration-100 text-xs font-medium"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* Header Preview of Item */}
      <div className="px-3 py-1.5 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 mb-1">
        <span className="text-sm shrink-0">{data.icon || '📄'}</span>
        <span className="truncate font-bold text-slate-900 dark:text-slate-100 flex-1" title={data.title}>
          {data.title}
        </span>
      </div>

      <div className="px-1 py-0.5 space-y-0.5">
        {/* If Tab Context */}
        {data.isTabContext ? (
          <>
            {data.onOpen && (
              <button
                type="button"
                onClick={() => {
                  data.onOpen?.();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2c2c2c] transition-colors cursor-pointer text-left text-slate-800 dark:text-slate-200"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="truncate">Beralih ke Tab Ini</span>
                </div>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (data.onOpenInNewBrowserTab) {
                  data.onOpenInNewBrowserTab();
                } else if (data.post) {
                  const pt = data.post.pt || 'TBP';
                  const pId = data.post.id;
                  const url = pId ? `/bulletin/${pt}?page=${encodeURIComponent(String(pId))}` : `/bulletin/${pt}`;
                  window.open(url, '_blank');
                }
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2c2c2c] transition-colors cursor-pointer text-left text-slate-800 dark:text-slate-200"
            >
              <div className="flex items-center gap-2.5 truncate">
                <ExternalLink className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="truncate">Buka di Tab Browser Baru</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                data.onCopyLink?.();
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2c2c2c] transition-colors cursor-pointer text-left text-slate-800 dark:text-slate-200"
            >
              <div className="flex items-center gap-2.5 truncate">
                <Copy className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="truncate">Salin Tautan</span>
              </div>
            </button>

            <div className="h-px bg-slate-100 dark:bg-slate-800/80 my-1" />

            {data.onCloseTab && (
              <button
                type="button"
                onClick={() => {
                  data.onCloseTab?.();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2c2c2c] transition-colors cursor-pointer text-left text-slate-800 dark:text-slate-200"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className="text-slate-400 font-bold ml-0.5">✕</span>
                  <span className="truncate">Tutup Tab</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">Ctrl+W</span>
              </button>
            )}

            {data.onCloseOtherTabs && (
              <button
                type="button"
                onClick={() => {
                  data.onCloseOtherTabs?.();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2c2c2c] transition-colors cursor-pointer text-left text-slate-800 dark:text-slate-200"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className="text-slate-400 font-bold ml-0.5">⇥</span>
                  <span className="truncate">Tutup Tab Lainnya</span>
                </div>
              </button>
            )}
          </>
        ) : (
          <>
            {/* 1. Buka Halaman Utama */}
            {data.onOpen && (
              <button
                type="button"
                onClick={() => {
                  data.onOpen?.();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2c2c2c] transition-colors cursor-pointer text-left text-slate-800 dark:text-slate-200"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="truncate">Buka Halaman</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">Enter</span>
              </button>
            )}

            {/* 2. Open in New Notion Tab */}
            {data.onOpenInNewNotionTab && (
              <button
                type="button"
                onClick={() => {
                  data.onOpenInNewNotionTab?.();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2c2c2c] transition-colors cursor-pointer text-left text-slate-800 dark:text-slate-200"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <ArrowUpRight className="w-4 h-4 text-sky-500 shrink-0" />
                  <span className="truncate">Buka di Tab Baru</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">Ctrl+Shift+↵</span>
              </button>
            )}

            {/* 3. Open in New Browser Window / Tab */}
            <button
              type="button"
              onClick={() => {
                if (data.onOpenInNewBrowserTab) {
                  data.onOpenInNewBrowserTab();
                } else if (data.linkUrl) {
                  window.open(data.linkUrl, '_blank');
                } else if (data.post) {
                  const pt = data.post.pt || 'TBP';
                  const pId = data.post.id;
                  const url = pId ? `/bulletin/${pt}?page=${encodeURIComponent(String(pId))}` : `/bulletin/${pt}`;
                  window.open(url, '_blank');
                }
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2c2c2c] transition-colors cursor-pointer text-left text-slate-800 dark:text-slate-200"
            >
              <div className="flex items-center gap-2.5 truncate">
                <ExternalLink className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="truncate">Buka di Tab Browser Baru</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono shrink-0">Ctrl+Click</span>
            </button>

            {/* 4. Copy Link */}
            <button
              type="button"
              onClick={() => {
                if (data.onCopyLink) {
                  data.onCopyLink();
                } else if (data.linkUrl) {
                  navigator.clipboard.writeText(data.linkUrl);
                  toast.success('Tautan berhasil disalin ke clipboard!');
                } else if (data.post) {
                  const pt = data.post.pt || 'TBP';
                  const pId = data.post.id;
                  const url = pId ? `${window.location.origin}/bulletin/${pt}?page=${encodeURIComponent(String(pId))}` : window.location.href;
                  navigator.clipboard.writeText(url);
                  toast.success('Tautan berhasil disalin ke clipboard!');
                }
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2c2c2c] transition-colors cursor-pointer text-left text-slate-800 dark:text-slate-200"
            >
              <div className="flex items-center gap-2.5 truncate">
                <Copy className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="truncate">Salin Tautan</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono shrink-0">Copy Link</span>
            </button>

            {/* Divider */}
            <div className="h-px bg-slate-100 dark:bg-slate-800/80 my-1" />

            {/* 5. Add / Remove Favorite */}
            {data.onToggleFavorite && (
              <button
                type="button"
                onClick={() => {
                  data.onToggleFavorite?.();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2c2c2c] transition-colors cursor-pointer text-left text-slate-800 dark:text-slate-200"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Star className={`w-4 h-4 shrink-0 ${data.isFavorite ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
                  <span className="truncate">{data.isFavorite ? 'Hapus dari Favorit' : 'Tambah ke Favorit'}</span>
                </div>
                {data.isFavorite && (
                  <span className="text-[10px] text-amber-500 font-bold">★ Fav</span>
                )}
              </button>
            )}

            {/* 6. Duplicate Page (if post exists) */}
            {data.onDuplicate && (
              <button
                type="button"
                onClick={() => {
                  data.onDuplicate?.();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2c2c2c] transition-colors cursor-pointer text-left text-slate-800 dark:text-slate-200"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <CopyPlus className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="truncate">Duplikat Halaman</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">Ctrl+D</span>
              </button>
            )}

            {/* 7. Delete / Move to Trash (if permitted) */}
            {data.canDelete && data.onDelete && (
              <>
                <div className="h-px bg-slate-100 dark:bg-slate-800/80 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    data.onDelete?.();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Trash2 className="w-4 h-4 shrink-0" />
                    <span className="truncate">Pindahkan ke Sampah</span>
                  </div>
                  <span className="text-[10px] text-red-400 font-mono shrink-0">Del</span>
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-3 pt-1.5 pb-0.5 border-t border-slate-100 dark:border-slate-800/80 mt-1 flex items-center justify-between text-[10px] text-slate-400">
        <span>Labnote • Notion Menu</span>
        <span className="flex items-center gap-1 font-mono text-[9.5px]">
          <Clock className="w-3 h-3 text-slate-400" /> Aktif
        </span>
      </div>
    </div>,
    document.body
  );
}
