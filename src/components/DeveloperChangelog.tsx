import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Input } from './ui';
import { 
  History, Sparkles, Shield, Bug, RefreshCw, FileText, ChevronDown, ChevronUp, 
  ChevronLeft, ChevronRight, Search, Copy, Check, Calendar, Tag, 
  Layers, SlidersHorizontal, AlertCircle, Wrench, Ban, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

import rawChangelog from '../../CHANGELOG.md?raw';
import { parseMarkdownChangelog, ChangelogRelease, ChangelogSection, ChangelogItem } from '../lib/changelog-parser';

export type { ChangelogItem, ChangelogSection, ChangelogRelease };

const BUNDLED_RELEASES = parseMarkdownChangelog(rawChangelog);

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode; bg: string; text: string; border: string }> = {
  feature: {
    label: 'Fitur Baru',
    icon: <Sparkles className="w-3.5 h-3.5" />,
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800'
  },
  security: {
    label: 'Keamanan',
    icon: <Shield className="w-3.5 h-3.5" />,
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800'
  },
  fix: {
    label: 'Perbaikan Bug',
    icon: <Bug className="w-3.5 h-3.5" />,
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800'
  },
  sync: {
    label: 'Sinkronisasi',
    icon: <RefreshCw className="w-3.5 h-3.5" />,
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800'
  },
  docs: {
    label: 'Standar Dokumen',
    icon: <FileText className="w-3.5 h-3.5" />,
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800'
  },
  maintenance: {
    label: 'Maintenance',
    icon: <Ban className="w-3.5 h-3.5" />,
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-300 dark:border-slate-700'
  },
  other: {
    label: 'Pembaruan',
    icon: <Wrench className="w-3.5 h-3.5" />,
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-200 dark:border-teal-800'
  }
};

export function DeveloperChangelog() {
  const [releases, setReleases] = useState<ChangelogRelease[]>(BUNDLED_RELEASES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View state: 'focus' (Single version detailed view) or 'accordion' (Timeline list view)
  const [viewMode, setViewMode] = useState<'focus' | 'accordion'>('focus');
  const [selectedVersion, setSelectedVersion] = useState<string>(() => {
    return BUNDLED_RELEASES.length > 0 ? BUNDLED_RELEASES[0].version : '';
  });
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>(() => {
    return BUNDLED_RELEASES.length > 0 ? { [BUNDLED_RELEASES[0].version]: true } : {};
  });
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeries, setSelectedSeries] = useState<string>('all');
  const [copiedVersion, setCopiedVersion] = useState<string | null>(null);

  // Fetch changelog from API with graceful fallback to bundled releases
  const fetchChangelog = async () => {
    try {
      const res = await fetch('/api/changelog');
      const json = await res.json();
      if (json.status === 'success' && json.data?.releases && json.data.releases.length > 0) {
        const fetchedReleases: ChangelogRelease[] = json.data.releases;
        setReleases(fetchedReleases);
        
        // Default to latest version if none selected
        if (!selectedVersion && fetchedReleases.length > 0) {
          const latest = fetchedReleases[0].version;
          setSelectedVersion(latest);
          setExpandedVersions(prev => ({ ...prev, [latest]: true }));
        }
      }
    } catch (err: any) {
      console.warn('Network fetch for changelog failed, using bundled fallback:', err);
    }
  };

  useEffect(() => {
    fetchChangelog();
  }, []);

  // Compute available series (e.g. "v2.8", "v2.7", "v2.6", "v2.5", "v2.4")
  const availableSeries = useMemo(() => {
    const seriesSet = new Set<string>();
    releases.forEach(r => {
      const parts = r.version.split('.');
      if (parts.length >= 2) {
        seriesSet.add(`v${parts[0]}.${parts[1]}`);
      }
    });
    return Array.from(seriesSet);
  }, [releases]);

  // Filtered releases based on search and series
  const filteredReleases = useMemo(() => {
    return releases.filter(rel => {
      // Filter series
      if (selectedSeries !== 'all') {
        const parts = rel.version.split('.');
        const s = `v${parts[0]}.${parts[1]}`;
        if (s !== selectedSeries) return false;
      }

      // Filter search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inVersion = rel.version.toLowerCase().includes(q);
        const inDate = rel.date.toLowerCase().includes(q);
        const inSections = rel.sections.some(sec => {
          if (sec.title.toLowerCase().includes(q)) return true;
          return sec.items.some(it => {
            if (it.title.toLowerCase().includes(q) || it.description.toLowerCase().includes(q)) return true;
            return it.subItems.some(sub => sub.toLowerCase().includes(q));
          });
        });
        return inVersion || inDate || inSections;
      }

      return true;
    });
  }, [releases, selectedSeries, searchQuery]);

  // Currently focused release
  const currentRelease = useMemo(() => {
    if (!selectedVersion && releases.length > 0) return releases[0];
    return releases.find(r => r.version === selectedVersion) || releases[0] || null;
  }, [releases, selectedVersion]);

  // Previous and next versions for navigation stepper
  const { prevVersion, nextVersion } = useMemo(() => {
    if (!currentRelease) return { prevVersion: null, nextVersion: null };
    const currentIndex = releases.findIndex(r => r.version === currentRelease.version);
    return {
      nextVersion: currentIndex > 0 ? releases[currentIndex - 1].version : null, // newer
      prevVersion: currentIndex < releases.length - 1 ? releases[currentIndex + 1].version : null // older
    };
  }, [releases, currentRelease]);

  // Toggle single accordion
  const toggleAccordion = (ver: string) => {
    setExpandedVersions(prev => ({
      ...prev,
      [ver]: !prev[ver]
    }));
  };

  // Expand all / Collapse all in accordion view
  const handleToggleAllAccordion = (expand: boolean) => {
    const nextState: Record<string, boolean> = {};
    filteredReleases.forEach(r => {
      nextState[r.version] = expand;
    });
    setExpandedVersions(nextState);
  };

  // Copy release summary to clipboard
  const handleCopyRelease = (rel: ChangelogRelease) => {
    let text = `🚀 *Prep & Lab Portal - Pembaruan Versi ${rel.version}* (${rel.date})\n\n`;
    rel.sections.forEach(sec => {
      text += `*${sec.title.trim()}*\n`;
      sec.items.forEach(it => {
        text += `• ${it.title ? `*${it.title}*: ` : ''}${it.description}\n`;
        it.subItems.forEach(sub => {
          text += `  - ${sub}\n`;
        });
      });
      text += `\n`;
    });

    navigator.clipboard.writeText(text.trim());
    setCopiedVersion(rel.version);
    toast.success(`Catatan rilis v${rel.version} disalin ke clipboard!`);
    setTimeout(() => setCopiedVersion(null), 2500);
  };

  // Format date helper
  const formatDateIndo = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parsed = parseISO(dateStr);
      return format(parsed, 'd MMMM yyyy', { locale: localeId });
    } catch {
      return dateStr;
    }
  };

  // Format text: replaces **bold** and `code` with styled spans
  const renderFormattedText = (text: string) => {
    if (!text) return null;
    
    // Quick token parser for inline code `...` and bold **...**
    const parts: React.ReactNode[] = [];
    let current = text;
    let key = 0;

    // Regex for bold or code
    const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    const tokens = current.split(regex);

    tokens.forEach(tok => {
      if (tok.startsWith('**') && tok.endsWith('**')) {
        const inner = tok.slice(2, -2);
        parts.push(
          <strong key={key++} className="font-semibold text-slate-900 dark:text-slate-100">
            {inner}
          </strong>
        );
      } else if (tok.startsWith('`') && tok.endsWith('`')) {
        const inner = tok.slice(1, -1);
        parts.push(
          <code 
            key={key++} 
            className="px-1.5 py-0.5 mx-0.5 text-xs font-mono font-medium rounded bg-slate-100 dark:bg-slate-800 text-teal-700 dark:text-teal-300 border border-slate-200 dark:border-slate-700"
          >
            {inner}
          </code>
        );
      } else if (tok) {
        parts.push(<span key={key++}>{tok}</span>);
      }
    });

    return parts;
  };

  if (loading) {
    return (
      <Card className="p-8 text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          Memuat catatan pembaruan sistem (Changelog)...
        </p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center space-y-4 border-rose-200 bg-rose-50/50">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-rose-800">Gagal Memuat Changelog</h3>
        <p className="text-xs text-rose-600">{error}</p>
        <Button onClick={fetchChangelog} className="mx-auto text-xs">
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Coba Lagi
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Top Banner & Control Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30">
              <History className="w-5 h-5" />
            </span>
            <h2 className="text-lg sm:text-xl font-black tracking-tight">Catatan Pembaruan Sistem</h2>
            {releases.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-teal-400/20 text-teal-300 border border-teal-400/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
                v{releases[0].version} Aktif
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Rangkuman lengkap histori fitur, peningkatan stabilitas, mitigasi keamanan, serta pembaruan alur kerja Prep & Lab Portal.
          </p>
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex items-center gap-2 shrink-0 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
          <button
            type="button"
            onClick={() => setViewMode('focus')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'focus' 
                ? 'bg-teal-600 text-white shadow-xs' 
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Mode Fokus</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('accordion')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'accordion' 
                ? 'bg-teal-600 text-white shadow-xs' 
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Mode Akordion</span>
          </button>
          <button
            type="button"
            title="Refresh dari file CHANGELOG.md"
            onClick={fetchChangelog}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari versi, fitur, kata kunci..."
            className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Series Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedSeries('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              selectedSeries === 'all'
                ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200 font-bold border border-teal-200 dark:border-teal-700'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Semua ({releases.length})
          </button>
          {availableSeries.map(series => {
            const count = releases.filter(r => r.version.startsWith(series.replace('v', ''))).length;
            return (
              <button
                key={series}
                type="button"
                onClick={() => setSelectedSeries(series)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedSeries === series
                    ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200 font-bold border border-teal-200 dark:border-teal-700'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {series} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* VIEW MODE 1: FOCUS / DETAIL MODE (DEFAULT) */}
      {viewMode === 'focus' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Sidebar: Version List */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-teal-600" />
                Daftar Rilis ({filteredReleases.length})
              </span>
              {currentRelease?.isLatest && (
                <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                  Rilis Terbaru Terpilih
                </span>
              )}
            </div>

            <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
              {filteredReleases.map(rel => {
                const isSelected = currentRelease?.version === rel.version;
                const categories = Array.from(new Set(rel.sections.map(s => s.category)));

                return (
                  <div
                    key={rel.version}
                    onClick={() => setSelectedVersion(rel.version)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none text-left ${
                      isSelected
                        ? 'bg-teal-50/80 dark:bg-teal-950/40 border-teal-500 dark:border-teal-500 shadow-xs ring-1 ring-teal-500'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-black tracking-tight ${isSelected ? 'text-teal-900 dark:text-teal-100' : 'text-slate-900 dark:text-slate-100'}`}>
                          v{rel.version}
                        </span>
                        {rel.isLatest && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold uppercase bg-teal-600 text-white tracking-wider">
                            Terbaru
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {rel.date}
                      </span>
                    </div>

                    {/* Excerpt title */}
                    <p className={`text-xs line-clamp-1 mb-2 ${isSelected ? 'text-teal-800 dark:text-teal-200 font-medium' : 'text-slate-600 dark:text-slate-400'}`}>
                      {rel.sections[0]?.cleanTitle || 'Pembaruan sistem'}
                    </p>

                    {/* Category badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {categories.map(cat => {
                        const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
                        return (
                          <span
                            key={cat}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border flex items-center gap-1 ${cfg.bg} ${cfg.text} ${cfg.border}`}
                          >
                            {cfg.icon}
                            <span>{cfg.label}</span>
                          </span>
                        );
                      })}
                      <span className="text-[10px] text-slate-400 ml-auto font-medium">
                        {rel.sections.length} modul
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredReleases.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-xs border border-dashed rounded-xl">
                  Tidak ada versi yang cocok dengan filter pencarian.
                </div>
              )}
            </div>
          </div>

          {/* Right Area: Selected Release Reading Card */}
          <div className="lg:col-span-8 space-y-4">
            {currentRelease ? (
              <Card className="p-5 sm:p-7 border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 space-y-6">
                {/* Release Header */}
                <div className="pb-5 border-b border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
                          Versi {currentRelease.version}
                        </span>
                        {currentRelease.isLatest ? (
                          <span className="px-2.5 py-1 rounded-md text-xs font-black uppercase bg-teal-600 text-white tracking-wider flex items-center gap-1 shadow-xs">
                            <Sparkles className="w-3.5 h-3.5" />
                            Versi Aktif Portal
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedVersion(releases[0]?.version || '')}
                            className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                          >
                            Kembali ke Versi Terbaru (v{releases[0]?.version})
                          </button>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                        <Calendar className="w-4 h-4 text-teal-600" />
                        Rilis: {formatDateIndo(currentRelease.date)} ({currentRelease.date})
                      </p>
                    </div>

                    {/* Quick Action: Copy */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => handleCopyRelease(currentRelease)}
                        className="text-xs font-bold flex items-center gap-1.5 h-9"
                      >
                        {copiedVersion === currentRelease.version ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Salin Rilis</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Navigation Stepper (Prev / Next Version) */}
                  <div className="flex items-center justify-between pt-2 text-xs font-semibold text-slate-500">
                    <div>
                      {prevVersion ? (
                        <button
                          type="button"
                          onClick={() => setSelectedVersion(prevVersion)}
                          className="flex items-center gap-1 hover:text-teal-600 transition-colors cursor-pointer py-1 px-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>Versi Sebelumnya (v{prevVersion})</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 italic">Rilis Perdana</span>
                      )}
                    </div>
                    <div>
                      {nextVersion ? (
                        <button
                          type="button"
                          onClick={() => setSelectedVersion(nextVersion)}
                          className="flex items-center gap-1 hover:text-teal-600 transition-colors cursor-pointer py-1 px-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <span>Versi Berikutnya (v{nextVersion})</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-teal-600 font-bold">Rilis Paling Baru</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sections List */}
                <div className="space-y-6">
                  {currentRelease.sections.map((sec, secIdx) => {
                    const catCfg = CATEGORY_CONFIG[sec.category] || CATEGORY_CONFIG.other;

                    return (
                      <div 
                        key={secIdx} 
                        className="rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-4"
                      >
                        {/* Section Header */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 pb-3 border-b border-slate-200/80 dark:border-slate-700/60">
                          <div className="flex items-start gap-2.5">
                            <span className="text-xl sm:text-2xl shrink-0 mt-0.5">
                              {sec.emoji || '✨'}
                            </span>
                            <div>
                              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                                {renderFormattedText(sec.cleanTitle)}
                              </h3>
                            </div>
                          </div>

                          <span className={`self-start px-2.5 py-1 rounded-full text-xs font-bold border shrink-0 flex items-center gap-1.5 ${catCfg.bg} ${catCfg.text} ${catCfg.border}`}>
                            {catCfg.icon}
                            <span>{catCfg.label}</span>
                          </span>
                        </div>

                        {/* Section Bullet Items */}
                        <div className="space-y-4 pl-1 sm:pl-2">
                          {sec.items.map((item, itIdx) => (
                            <div key={itIdx} className="space-y-2">
                              {/* Main item line */}
                              <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 mt-2"></span>
                                <div className="space-y-1 w-full">
                                  {item.title ? (
                                    <div className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                                      {item.title}
                                    </div>
                                  ) : null}
                                  {item.description ? (
                                    <p className="text-slate-600 dark:text-slate-300">
                                      {renderFormattedText(item.description)}
                                    </p>
                                  ) : null}
                                </div>
                              </div>

                              {/* Sub-bullets / details */}
                              {item.subItems.length > 0 && (
                                <div className="ml-5 sm:ml-6 pl-3 border-l-2 border-slate-200 dark:border-slate-700 space-y-2 pt-1">
                                  {item.subItems.map((sub, sIdx) => (
                                    <div key={sIdx} className="flex items-start gap-2 text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                      <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0 mt-2"></span>
                                      <div>{renderFormattedText(sub)}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ) : (
              <Card className="p-8 text-center text-slate-500">
                Pilih versi di sebelah kiri untuk melihat catatan rilis.
              </Card>
            )}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: ACCORDION TIMELINE MODE */}
      {viewMode === 'accordion' && (
        <div className="space-y-3">
          {/* Quick Accordion Controls */}
          <div className="flex items-center justify-between px-1 text-xs text-slate-500">
            <span>Menampilkan {filteredReleases.length} versi pembaruan</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleToggleAllAccordion(true)}
                className="text-teal-600 font-semibold hover:underline"
              >
                Buka Semua
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => handleToggleAllAccordion(false)}
                className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Tutup Semua
              </button>
            </div>
          </div>

          {/* Accordion Stack */}
          <div className="space-y-3">
            {filteredReleases.map(rel => {
              const isExpanded = !!expandedVersions[rel.version];
              const categories = Array.from(new Set(rel.sections.map(s => s.category)));

              return (
                <Card 
                  key={rel.version}
                  className={`overflow-hidden border transition-all ${
                    rel.isLatest
                      ? 'border-teal-500/80 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {/* Accordion Header */}
                  <div
                    onClick={() => toggleAccordion(rel.version)}
                    className={`p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer select-none transition-colors ${
                      rel.isLatest 
                        ? 'bg-teal-50/40 dark:bg-teal-950/20 hover:bg-teal-50/70' 
                        : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                          v{rel.version}
                        </span>
                        {rel.isLatest && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-teal-600 text-white tracking-wider">
                            Terbaru
                          </span>
                        )}
                      </div>

                      <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {rel.date}
                      </span>

                      {/* Excerpt of title */}
                      <span className="hidden md:inline-block text-xs text-slate-600 dark:text-slate-400 max-w-md truncate">
                        — {rel.sections[0]?.cleanTitle || 'Pembaruan sistem'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="hidden sm:flex items-center gap-1.5">
                        {categories.slice(0, 3).map(cat => {
                          const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
                          return (
                            <span
                              key={cat}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                            >
                              {cfg.label}
                            </span>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyRelease(rel);
                        }}
                        title="Salin Catatan Rilis Ini"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        {copiedVersion === rel.version ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>

                      <div className="p-1 rounded-lg text-slate-400">
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-teal-600" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* Accordion Body */}
                  {isExpanded && (
                    <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-5 animate-in slide-in-from-top-2 duration-200">
                      {rel.sections.map((sec, secIdx) => {
                        const catCfg = CATEGORY_CONFIG[sec.category] || CATEGORY_CONFIG.other;

                        return (
                          <div 
                            key={secIdx} 
                            className="rounded-xl p-4 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/70 dark:border-slate-700/50">
                              <div className="flex items-center gap-2">
                                <span className="text-lg shrink-0">{sec.emoji || '✨'}</span>
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                                  {renderFormattedText(sec.cleanTitle)}
                                </h4>
                              </div>
                              <span className={`self-start px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${catCfg.bg} ${catCfg.text} ${catCfg.border}`}>
                                {catCfg.label}
                              </span>
                            </div>

                            <div className="space-y-3 pl-1">
                              {sec.items.map((item, itIdx) => (
                                <div key={itIdx} className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                                  <div className="flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 mt-1.5"></span>
                                    <div>
                                      {item.title && (
                                        <span className="font-bold text-slate-900 dark:text-slate-100 mr-1.5">
                                          {item.title}:
                                        </span>
                                      )}
                                      <span>{renderFormattedText(item.description)}</span>
                                    </div>
                                  </div>

                                  {item.subItems.length > 0 && (
                                    <div className="ml-5 pl-2.5 border-l-2 border-slate-200 dark:border-slate-700 space-y-1 pt-0.5">
                                      {item.subItems.map((sub, sIdx) => (
                                        <div key={sIdx} className="flex items-start gap-1.5 text-slate-600 dark:text-slate-400">
                                          <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0 mt-1.5"></span>
                                          <div>{renderFormattedText(sub)}</div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
