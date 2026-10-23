import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  X, 
  Clock, 
  Sparkles, 
  ArrowRight,
  CornerDownLeft,
  FileText,
  FileSpreadsheet,
  Paperclip,
  CheckSquare,
  ExternalLink,
  Image as ImageIcon,
  BookOpen,
  Folder,
  Layers,
  Loader2,
  Filter
} from 'lucide-react';
import { ALL_PORTAL_MODULES, PortalModuleItem } from './ModuleSearchBar';

export type SearchTabFilter = 'ALL' | 'TOPICS' | 'ATTACHMENTS' | 'TASKS' | 'MODULES';

interface OmnisearchTopic {
  id: number;
  title: string;
  department?: string;
  category?: string;
  authorName?: string;
  pt?: string;
  createdAt?: string;
  snippet?: string;
  link: string;
}

interface OmnisearchAttachment {
  id: string;
  name: string;
  url: string;
  fileType: 'pdf' | 'excel' | 'word' | 'image' | 'archive' | 'drive' | 'file';
  sourcePostId?: number;
  sourcePostTitle?: string;
  sourceTopic?: string;
  sourceSection?: string;
  uploader?: string;
  pt?: string;
  createdAt?: string;
  link: string;
}

interface OmnisearchTask {
  id: string;
  postId: number;
  postTitle?: string;
  section?: string;
  pt?: string;
  taskTitle: string;
  desc?: string;
  pic?: string;
  status?: string;
  priority?: string;
  link: string;
}

interface HeaderModuleSearchBarProps {
  onNav: (tab: string) => void;
  onOpenKta?: () => void;
  onOpenP5m?: () => void;
  inspectorRole?: string | null;
  userPt?: string;
}

export function HeaderModuleSearchBar({
  onNav,
  onOpenKta,
  onOpenP5m,
  inspectorRole,
  userPt
}: HeaderModuleSearchBarProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SearchTabFilter>('ALL');
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  
  // Real-time server search state
  const [isSearchingServer, setIsSearchingServer] = useState(false);
  const [serverTopics, setServerTopics] = useState<OmnisearchTopic[]>([]);
  const [serverAttachments, setServerAttachments] = useState<OmnisearchAttachment[]>([]);
  const [serverTasks, setServerTasks] = useState<OmnisearchTask[]>([]);

  // Keyboard navigation tracking index
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('preplab_recent_module_searches');
      return saved ? JSON.parse(saved) : ['P2H', 'Logbook', 'Kalibrasi', 'Inspeksi', 'SOP'];
    } catch (e) {
      return ['P2H', 'Logbook', 'Kalibrasi', 'Inspeksi', 'SOP'];
    }
  });

  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // 1. Instant Client-side Filter for Portal Modules
  const filteredModules = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
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

  // 2. Debounced Server-side Omnisearch for Topics, Attachments, and Logbook Tasks
  useEffect(() => {
    const cleanQ = query.trim();
    if (cleanQ.length < 2) {
      setServerTopics([]);
      setServerAttachments([]);
      setServerTasks([]);
      setIsSearchingServer(false);
      return;
    }

    setIsSearchingServer(true);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const activePt = userPt || 'TBP';
        const res = await fetch(`/api/search/omni?q=${encodeURIComponent(cleanQ)}&pt=${encodeURIComponent(activePt)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'success' && json.data) {
            setServerTopics(json.data.topics || []);
            setServerAttachments(json.data.attachments || []);
            setServerTasks(json.data.tasks || []);
          }
        }
      } catch (err) {
        console.warn('[Omnisearch Fetch Error]:', err);
      } finally {
        setIsSearchingServer(false);
      }
    }, 240);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, userPt]);

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

  // Handle topic navigation
  const handleSelectTopic = (topic: OmnisearchTopic) => {
    addRecentSearch(topic.title);
    setIsOpen(false);
    setIsMobileModalOpen(false);
    setQuery('');
    navigate(topic.link);
  };

  // Handle task navigation
  const handleSelectTask = (task: OmnisearchTask) => {
    addRecentSearch(task.taskTitle);
    setIsOpen(false);
    setIsMobileModalOpen(false);
    setQuery('');
    navigate(task.link);
  };

  // Handle attachment click
  const handleOpenAttachment = (att: OmnisearchAttachment, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    addRecentSearch(att.name);
    setIsOpen(false);
    setIsMobileModalOpen(false);
    if (att.url) {
      window.open(att.url, '_blank', 'noopener,noreferrer');
    } else if (att.link) {
      navigate(att.link);
    }
  };

  // Helper to render file icon and styling
  const renderFileBadge = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return {
          icon: <FileText className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
          bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900',
          label: 'PDF'
        };
      case 'excel':
        return {
          icon: <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
          bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900',
          label: 'EXCEL'
        };
      case 'word':
        return {
          icon: <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
          bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900',
          label: 'DOC'
        };
      case 'image':
        return {
          icon: <ImageIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
          bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900',
          label: 'GAMBAR'
        };
      case 'drive':
        return {
          icon: <ExternalLink className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
          bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
          label: 'DRIVE'
        };
      default:
        return {
          icon: <Paperclip className="w-4 h-4 text-slate-600 dark:text-slate-400" />,
          bg: 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
          label: 'FILE'
        };
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

  // Compute total counts
  const totalCounts = useMemo(() => {
    return {
      all: filteredModules.length + serverTopics.length + serverAttachments.length + serverTasks.length,
      topics: serverTopics.length,
      attachments: serverAttachments.length,
      tasks: serverTasks.length,
      modules: filteredModules.length
    };
  }, [filteredModules, serverTopics, serverAttachments, serverTasks]);

  // Tab Filtering Header Component
  const renderTabs = () => (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 overflow-x-auto text-xs shrink-0 scrollbar-none">
      <button
        type="button"
        onClick={() => setActiveTab('ALL')}
        className={`px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
          activeTab === 'ALL'
            ? 'bg-teal-600 text-white shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
        }`}
      >
        <span>Semua</span>
        {query && <span className="text-[10px] opacity-80 font-mono">({totalCounts.all})</span>}
      </button>

      <button
        type="button"
        onClick={() => setActiveTab('TOPICS')}
        className={`px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
          activeTab === 'TOPICS'
            ? 'bg-teal-600 text-white shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
        }`}
      >
        <BookOpen className="w-3.5 h-3.5" />
        <span>Topik Labnote</span>
        {serverTopics.length > 0 && <span className="text-[10px] opacity-80 font-mono">({serverTopics.length})</span>}
      </button>

      <button
        type="button"
        onClick={() => setActiveTab('ATTACHMENTS')}
        className={`px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
          activeTab === 'ATTACHMENTS'
            ? 'bg-teal-600 text-white shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
        }`}
      >
        <Paperclip className="w-3.5 h-3.5" />
        <span>File & Lampiran</span>
        {serverAttachments.length > 0 && <span className="text-[10px] opacity-80 font-mono">({serverAttachments.length})</span>}
      </button>

      <button
        type="button"
        onClick={() => setActiveTab('TASKS')}
        className={`px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
          activeTab === 'TASKS'
            ? 'bg-teal-600 text-white shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
        }`}
      >
        <CheckSquare className="w-3.5 h-3.5" />
        <span>Aktivitas</span>
        {serverTasks.length > 0 && <span className="text-[10px] opacity-80 font-mono">({serverTasks.length})</span>}
      </button>

      <button
        type="button"
        onClick={() => setActiveTab('MODULES')}
        className={`px-2.5 py-1 rounded-lg font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
          activeTab === 'MODULES'
            ? 'bg-teal-600 text-white shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
        }`}
      >
        <Layers className="w-3.5 h-3.5" />
        <span>Modul Portal</span>
        {filteredModules.length > 0 && <span className="text-[10px] opacity-80 font-mono">({filteredModules.length})</span>}
      </button>

      {isSearchingServer && (
        <div className="ml-auto pl-2 flex items-center gap-1.5 text-teal-600 text-[11px] shrink-0 font-medium">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span className="hidden sm:inline">Mencari...</span>
        </div>
      )}
    </div>
  );

  // Render Combined Search Content
  const renderResultsList = (isMobile = false) => {
    const showAll = activeTab === 'ALL';
    const showTopics = showAll || activeTab === 'TOPICS';
    const showAttachments = showAll || activeTab === 'ATTACHMENTS';
    const showTasks = showAll || activeTab === 'TASKS';
    const showModules = showAll || activeTab === 'MODULES';

    const hasAnyResults = 
      (showTopics && serverTopics.length > 0) ||
      (showAttachments && serverAttachments.length > 0) ||
      (showTasks && serverTasks.length > 0) ||
      (showModules && filteredModules.length > 0);

    if (!hasAnyResults && query.trim().length >= 2 && !isSearchingServer) {
      return (
        <div className="py-12 text-center text-xs text-slate-400 space-y-2 px-4">
          <Search className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600" />
          <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Tidak ditemukan hasil</p>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            Tidak ada topik, dokumen lampiran, maupun modul yang cocok dengan kata kunci "{query}".
          </p>
        </div>
      );
    }

    return (
      <div className={`space-y-4 p-2 ${isMobile ? 'max-h-[65vh]' : 'max-h-[460px]'} overflow-y-auto`}>
        {/* 1. TOPICS SECTION */}
        {showTopics && serverTopics.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 pt-1 pb-1 text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Topik Labnote ({serverTopics.length})
              </span>
            </div>
            {serverTopics.map((item) => (
              <div
                key={`topic-${item.id}`}
                onClick={() => handleSelectTopic(item)}
                className="group flex items-start justify-between p-2.5 rounded-xl hover:bg-teal-500/10 dark:hover:bg-teal-500/15 transition-all cursor-pointer border border-transparent hover:border-teal-500/25"
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-900 shrink-0 mt-0.5">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                        {item.title}
                      </h4>
                      {item.category && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {item.category}
                        </span>
                      )}
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                        {item.pt}
                      </span>
                    </div>
                    {item.snippet && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 italic">
                        {item.snippet}
                      </p>
                    )}
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Oleh: {item.authorName || 'Personil'} &bull; Labnote PrepLab
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 transition-colors shrink-0 ml-2 mt-2" />
              </div>
            ))}
          </div>
        )}

        {/* 2. ATTACHMENTS & FILES SECTION */}
        {showAttachments && serverAttachments.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 pt-1 pb-1 text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              <span className="flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" /> Lampiran & Dokumen ({serverAttachments.length})
              </span>
            </div>
            {serverAttachments.map((item) => {
              const badge = renderFileBadge(item.fileType);
              return (
                <div
                  key={`att-${item.id}`}
                  onClick={() => handleOpenAttachment(item)}
                  className="group flex items-start justify-between p-2.5 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-all cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className={`p-2 rounded-lg border shrink-0 mt-0.5 ${badge.bg}`}>
                      {badge.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded border tracking-wider uppercase font-mono shrink-0 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">
                          {badge.label}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors truncate">
                          {item.name}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        Sumber: {item.sourcePostTitle || item.sourceTopic || 'Dokumen Labnote'} {item.sourceSection ? `(${item.sourceSection})` : ''}
                      </p>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {item.uploader ? `Diunggah oleh: ${item.uploader}` : 'Lampiran Resmi'} &bull; PT {item.pt || 'TBP'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2 mt-1">
                    <button
                      type="button"
                      onClick={(e) => handleOpenAttachment(item, e)}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors flex items-center gap-1 shadow-2xs"
                      title="Buka / Unduh File"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Buka File</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 3. LOGBOOK TASKS SECTION */}
        {showTasks && serverTasks.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 pt-1 pb-1 text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              <span className="flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5" /> Baris Aktivitas / Logbook ({serverTasks.length})
              </span>
            </div>
            {serverTasks.map((item) => (
              <div
                key={`task-${item.id}`}
                onClick={() => handleSelectTask(item)}
                className="group flex items-start justify-between p-2.5 rounded-xl hover:bg-indigo-500/10 dark:hover:bg-indigo-500/15 transition-all cursor-pointer border border-transparent hover:border-indigo-500/25"
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 shrink-0 mt-0.5">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {item.taskTitle}
                      </h4>
                      {item.status && item.status !== '-' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                          {item.status}
                        </span>
                      )}
                      {item.priority && item.priority !== '-' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                          {item.priority}
                        </span>
                      )}
                    </div>
                    {item.desc && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                        {item.desc}
                      </p>
                    )}
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      PIC: {item.pic || '-'} &bull; Pada: {item.postTitle || item.section || 'Logbook Seksi'}
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0 ml-2 mt-2" />
              </div>
            ))}
          </div>
        )}

        {/* 4. PORTAL MODULES SECTION */}
        {showModules && filteredModules.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 pt-1 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Modul & Fitur Portal ({filteredModules.length})
              </span>
            </div>
            {filteredModules.map((item) => (
              <div
                key={`mod-${item.id}`}
                onClick={() => handleSelectModule(item)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-2 rounded-xl border shrink-0 ${item.iconBg} ${item.iconColor}`}>
                    {item.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 transition-colors truncate">
                      {item.title}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate leading-snug mt-0.5">{item.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 pl-2">
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200/60 dark:border-slate-700">
                    {item.category}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div id="header-module-search" className="relative flex-1 max-w-[220px] sm:max-w-xs md:max-w-md lg:max-w-xl mx-2 sm:mx-4">
      {/* ── Desktop Search Bar (Centered in Header) ── */}
      <div className="hidden sm:flex items-center relative w-full">
        <div className="relative w-full">
          <input
            ref={desktopInputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setIsOpen(false);
            }}
            placeholder="Cari topik Labnote, lampiran file PDF, aktivitas, modul..."
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
                className="pointer-events-auto p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600"
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

        {/* ── Desktop Dropdown Palette ── */}
        {isOpen && (
          <div 
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-[100] animate-in fade-in duration-100"
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

            {/* Filter Tabs */}
            {query.trim().length >= 2 && renderTabs()}

            {/* Results Content */}
            {renderResultsList(false)}

            {/* Dropdown Footer */}
            <div className="px-3 py-1.5 bg-slate-50 dark:bg-[#151515] border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
              <span>Mencari di seluruh universe {userPt || 'TBP'} &bull; Labnote & Dokumen</span>
              <span className="font-mono text-[9px]">ESC tutup</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile Search Trigger Button ── */}
      <div className="sm:hidden flex items-center justify-center">
        <button
          type="button"
          onClick={() => {
            setIsMobileModalOpen(true);
            setTimeout(() => mobileInputRef.current?.focus(), 100);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium active:scale-95 transition-transform"
          title="Cari modul operasional & dokumen"
        >
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[11px]">Cari</span>
        </button>
      </div>

      {/* ── Mobile Fullscreen Drawer Modal ── */}
      {typeof document !== 'undefined' && createPortal(
        isMobileModalOpen ? (
          <div 
            onClick={() => {
              setIsMobileModalOpen(false);
              setQuery('');
            }}
            className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-xs flex flex-col justify-start p-2.5 pt-4 sm:hidden animate-in fade-in duration-150"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] w-full"
            >
              {/* Header Input */}
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2.5 shrink-0">
                <Search className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <input
                  ref={mobileInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari topik Labnote, file lampiran, aktivitas..."
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
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
                <span className="text-[10px] font-semibold text-slate-400 shrink-0">Sering Dicari:</span>
                {['Logbook', 'Kalibrasi', 'XRF', 'P2H', 'SOP', 'Inspeksi', 'Roster'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setQuery(tag);
                      mobileInputRef.current?.focus();
                    }}
                    className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-600 dark:text-slate-300 hover:text-teal-600 transition-colors shrink-0"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Filter Tabs on Mobile */}
              {query.trim().length >= 2 && renderTabs()}

              {/* Results List */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                {renderResultsList(true)}
              </div>
            </div>
          </div>
        ) : null,
        document.body
      )}
    </div>
  );
}
