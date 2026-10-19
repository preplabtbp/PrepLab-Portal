import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  ShieldAlert, 
  ShieldCheck, 
  ClipboardList, 
  FlaskConical, 
  Award, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  ExternalLink, 
  Sparkles, 
  X,
  FileText,
  Filter,
  CheckCircle2,
  Plus
} from 'lucide-react';
import { LibraryDocType } from './notion/CompanyLibraryHub';

interface BulletinLibraryAccordionProps {
  posts: any[];
  onSelectPost: (post: any) => void;
  onOpenFullLibrary?: (type?: LibraryDocType) => void;
  activeUniverse?: string;
}

interface ParsedDoc {
  raw: any;
  code: string | null;
  cleanTitle: string;
  department: string;
  dateStr: string;
}

const SECTION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Sample Preparation': { bg: 'bg-amber-500/10 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300/60 dark:border-amber-800/60' },
  'Wet Laboratory': { bg: 'bg-sky-500/10 dark:bg-sky-950/40', text: 'text-sky-700 dark:text-sky-300', border: 'border-sky-300/60 dark:border-sky-800/60' },
  'XRF & Instrumentasi': { bg: 'bg-purple-500/10 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300/60 dark:border-purple-800/60' },
  'HSE & K3LH': { bg: 'bg-emerald-500/10 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300/60 dark:border-emerald-800/60' },
  'Quality Assurance': { bg: 'bg-rose-500/10 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-300/60 dark:border-rose-800/60' },
  'Administrasi & Umum': { bg: 'bg-slate-500/10 dark:bg-slate-800/40', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-300/60 dark:border-slate-700/60' },
};

function parseDocInfo(post: any): ParsedDoc {
  const rawTitle = (post.title || '').trim();
  const match = rawTitle.match(/^\[(.*?)\]\s*(.*)$/);
  const code = match ? match[1].trim() : null;
  const cleanTitle = match ? match[2].trim() : (rawTitle || 'Dokumen Resmi Tanpa Judul');
  const dept = (post.department || 'Prep & Lab').trim();

  let dateStr = '';
  if (post.createdAt) {
    try {
      dateStr = new Date(post.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {}
  }

  return {
    raw: post,
    code,
    cleanTitle,
    department: dept,
    dateStr
  };
}

export function BulletinLibraryAccordion({
  posts,
  onSelectPost,
  onOpenFullLibrary,
  activeUniverse = 'TBP'
}: BulletinLibraryAccordionProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('ALL');

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Group and categorize all library documents from posts
  const categorizedDocs = useMemo(() => {
    const safetyFlashList: ParsedDoc[] = [];
    const sopList: ParsedDoc[] = [];
    const jsaList: ParsedDoc[] = [];
    const ikList: ParsedDoc[] = [];
    const msdsList: ParsedDoc[] = [];
    const isoList: ParsedDoc[] = [];

    posts.forEach((p) => {
      const cat = (p.category || '').toUpperCase();
      const title = (p.title || '').toUpperCase();
      const tags: string[] = Array.isArray(p.tags) ? p.tags.map((t: string) => String(t).toUpperCase()) : [];
      const dept = (p.department || '').toUpperCase();

      const isLibrary = 
        cat.startsWith('LIBRARY') ||
        ['SOP', 'JSA', 'IK', 'SAFETY_FLASH', 'MSDS', 'STANDAR', 'PROCEDURE', 'PROSEDUR'].includes(cat) ||
        tags.some(t => ['LIBRARY', 'SOP', 'JSA', 'IK', 'SAFETY_FLASH', 'MSDS', 'PROSEDUR'].includes(t)) ||
        title.startsWith('[SOP') ||
        title.startsWith('[JSA') ||
        title.startsWith('[IK') ||
        title.startsWith('[MSDS') ||
        title.startsWith('[SAFETY') ||
        dept === 'LIBRARY';

      if (!isLibrary) return;

      const doc = parseDocInfo(p);

      // Check ISO Standards
      if (title.includes('ISO') || cat.includes('ISO') || tags.includes('ISO') || title.includes('SNI')) {
        isoList.push(doc);
      }

      // Check Safety Flash
      if (
        cat.includes('SAFETY_FLASH') || 
        cat.includes('FLASH') || 
        tags.includes('SAFETY_FLASH') || 
        title.includes('SAFETY FLASH') || 
        title.includes('SAFETY ALERT')
      ) {
        safetyFlashList.push(doc);
      } else if (cat.includes('JSA') || tags.includes('JSA') || title.startsWith('[JSA-') || title.includes('JOB SAFETY ANALYSIS')) {
        jsaList.push(doc);
      } else if (cat.includes('IK') || tags.includes('IK') || title.startsWith('[IK-') || title.includes('INSTRUKSI KERJA')) {
        ikList.push(doc);
      } else if (cat.includes('MSDS') || tags.includes('MSDS') || title.startsWith('[MSDS-') || title.includes('LEMBAR DATA KESELAMATAN') || title.includes('CRM ')) {
        msdsList.push(doc);
      } else if (cat.includes('SOP') || tags.includes('SOP') || title.startsWith('[SOP-') || title.includes('STANDAR OPERASIONAL')) {
        sopList.push(doc);
      } else {
        // Fallback into SOP if general library document
        sopList.push(doc);
      }
    });

    return {
      safetyFlash: safetyFlashList,
      sop: sopList,
      jsa: jsaList,
      ik: ikList,
      msds: msdsList,
      iso: isoList
    };
  }, [posts]);

  // Total count of official documents
  const totalLibraryDocsCount = useMemo(() => {
    return (
      categorizedDocs.safetyFlash.length +
      categorizedDocs.sop.length +
      categorizedDocs.jsa.length +
      categorizedDocs.ik.length +
      categorizedDocs.msds.length
    );
  }, [categorizedDocs]);

  // Category definitions with styled badges & icons
  const categories = useMemo(() => [
    {
      id: 'safety_flash',
      docTypeKey: 'SAFETY_FLASH' as LibraryDocType,
      title: 'Safety Flash & Alert K3',
      shortTitle: 'Safety Flash',
      desc: 'Peringatan kilat insiden, memo keselamatan & safety talk HSE',
      icon: <ShieldAlert className="w-5 h-5 text-rose-500 dark:text-rose-400" />,
      bgIcon: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-rose-500/10',
      pillColor: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60',
      tagColor: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
      items: categorizedDocs.safetyFlash
    },
    {
      id: 'sop',
      docTypeKey: 'SOP' as LibraryDocType,
      title: 'SOP Operasional',
      shortTitle: 'SOP Standar',
      desc: 'Standar Operasional Prosedur kerja menyeluruh & regulasi mutu',
      icon: <BookOpen className="w-5 h-5 text-sky-500 dark:text-sky-400" />,
      bgIcon: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 shadow-sky-500/10',
      pillColor: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200/60 dark:border-sky-800/60',
      tagColor: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
      items: categorizedDocs.sop
    },
    {
      id: 'jsa',
      docTypeKey: 'JSA' as LibraryDocType,
      title: 'Job Safety Analysis (JSA)',
      shortTitle: 'JSA K3',
      desc: 'Analisis potensi bahaya, Golden Rules & langkah pengendalian K3',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />,
      bgIcon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-emerald-500/10',
      pillColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60',
      tagColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      items: categorizedDocs.jsa
    },
    {
      id: 'ik',
      docTypeKey: 'IK' as LibraryDocType,
      title: 'Instruksi Kerja (IK)',
      shortTitle: 'Petunjuk Teknis',
      desc: 'Panduan teknis langkah-demi-langkah alat, instrumen XRF & uji lab',
      icon: <ClipboardList className="w-5 h-5 text-amber-500 dark:text-amber-400" />,
      bgIcon: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-amber-500/10',
      pillColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60',
      tagColor: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
      items: categorizedDocs.ik
    },
    {
      id: 'msds',
      docTypeKey: 'MSDS' as LibraryDocType,
      title: 'MSDS / Bahan B3 & Standar CRM',
      shortTitle: 'MSDS & CRM',
      desc: 'Lembar keselamatan bahan kimia berbahaya & standar CRM OREAS',
      icon: <FlaskConical className="w-5 h-5 text-purple-500 dark:text-purple-400" />,
      bgIcon: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-purple-500/10',
      pillColor: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/60',
      tagColor: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
      items: categorizedDocs.msds
    },
    {
      id: 'iso',
      docTypeKey: 'ALL' as LibraryDocType,
      title: 'Standar Mutu & Regulasi ISO',
      shortTitle: 'Standar Mutu',
      desc: 'Sistem manajemen mutu ISO 17025, ISO 14001, ISO 45001 & kebijakan',
      icon: <Award className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />,
      bgIcon: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-indigo-500/10',
      pillColor: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/60',
      tagColor: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
      items: categorizedDocs.iso
    }
  ], [categorizedDocs]);

  // Filter helper based on search query and section
  const filterDocList = (items: ParsedDoc[]) => {
    return items.filter(doc => {
      if (selectedSectionFilter !== 'ALL') {
        if (!doc.department.toLowerCase().includes(selectedSectionFilter.toLowerCase())) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const codeMatch = (doc.code || '').toLowerCase().includes(q);
        const titleMatch = doc.cleanTitle.toLowerCase().includes(q);
        const deptMatch = doc.department.toLowerCase().includes(q);
        const contentMatch = (doc.raw.content || '').toLowerCase().includes(q);
        if (!codeMatch && !titleMatch && !deptMatch && !contentMatch) return false;
      }
      return true;
    });
  };

  return (
    <div className="space-y-3 pt-1">
      {/* ── HEADER CARD: COMPANY LIBRARY HUB ── */}
      <div 
        className="rounded-2xl border p-4 sm:p-5 transition-all duration-300 shadow-md relative overflow-hidden backdrop-blur-xl"
        style={{
          backgroundColor: 'var(--card-bg, rgba(255, 255, 255, 0.85))',
          borderColor: 'var(--border-main, rgba(148, 163, 184, 0.25))'
        }}
      >
        {/* Ambient Top Glow */}
        <div 
          className="absolute -top-10 -right-10 w-44 h-44 rounded-full pointer-events-none opacity-20 blur-2xl"
          style={{ background: 'radial-gradient(circle, #F59E0B, transparent 70%)' }}
        />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/25 shrink-0">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-sm sm:text-base tracking-tight" style={{ color: 'var(--text-main, #0f172a)' }}>
                  Pusat Library & Dokumen K3
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold">
                  {totalLibraryDocsCount} Dokumen
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] line-clamp-1" style={{ color: 'var(--text-muted, #64748b)' }}>
                SOP, JSA, Instruksi Kerja, Safety Flash & Standar Acuan Resmi
              </p>
            </div>
          </div>

          {onOpenFullLibrary && (
            <button
              type="button"
              onClick={() => onOpenFullLibrary('ALL')}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer hover:scale-[1.02] active:scale-95 shrink-0 shadow-2xs"
              title="Buka tampilan penuh Company Library Hub"
            >
              <span>Buka Full Library</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Bar & Quick Filter Inside Card */}
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari SOP, JSA, IK, alat, bahaya, bahan..."
              className="w-full pl-8 pr-7 py-1.5 rounded-xl text-xs font-medium border transition-colors focus:outline-hidden"
              style={{
                backgroundColor: 'var(--input-bg, rgba(0, 0, 0, 0.03))',
                borderColor: 'var(--border-main, rgba(148, 163, 184, 0.25))',
                color: 'var(--text-main, #0f172a)'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={selectedSectionFilter}
            onChange={(e) => setSelectedSectionFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-colors cursor-pointer shrink-0 max-w-[130px]"
            style={{
              backgroundColor: 'var(--input-bg, rgba(0, 0, 0, 0.03))',
              borderColor: 'var(--border-main, rgba(148, 163, 184, 0.25))',
              color: 'var(--text-main, #0f172a)'
            }}
          >
            <option value="ALL">Semua Seksi</option>
            <option value="Sample Preparation">Preparasi</option>
            <option value="Wet Laboratory">Wet Lab</option>
            <option value="XRF">XRF Instrument</option>
            <option value="HSE">HSE & K3</option>
            <option value="Quality Assurance">QA Mutu</option>
            <option value="Administrasi">Admin / HR</option>
          </select>
        </div>
      </div>

      {/* ── ACCORDION CATEGORIES LIST ── */}
      <div className="space-y-2.5">
        {categories.map((category) => {
          const filteredItems = filterDocList(category.items);
          const isExpanded = !!openSections[category.id] || (searchQuery.trim().length > 0 && filteredItems.length > 0);

          return (
            <div 
              key={category.id} 
              className="rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs hover:border-slate-300 dark:hover:border-slate-700 backdrop-blur-md"
              style={{
                backgroundColor: 'var(--card-bg, rgba(255, 255, 255, 0.85))',
                borderColor: 'var(--border-main, rgba(148, 163, 184, 0.25))'
              }}
            >
              {/* Accordion Header Button */}
              <button
                type="button"
                onClick={() => toggleSection(category.id)}
                className="w-full px-4 py-3 sm:px-4.5 sm:py-3.5 flex items-center justify-between text-left transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer select-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-200 hover:scale-105 shadow-2xs ${category.bgIcon}`}>
                    {category.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span 
                        className="text-sm sm:text-base font-bold tracking-tight truncate"
                        style={{ color: 'var(--text-main, #0f172a)' }}
                      >
                        {category.title}
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 border ${category.pillColor}`}>
                        {filteredItems.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] line-clamp-1 hidden sm:block" style={{ color: 'var(--text-muted, #64748b)' }}>
                      {category.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="p-1 rounded-lg text-slate-400 dark:text-slate-500 transition-colors">
                    <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-amber-500' : ''}`} />
                  </div>
                </div>
              </button>

              {/* Accordion Body Content */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    className="overflow-hidden border-t"
                    style={{ borderColor: 'var(--border-main, rgba(148, 163, 184, 0.18))' }}
                  >
                    <div 
                      className="p-3 space-y-2"
                      style={{ backgroundColor: 'var(--bg-main, rgba(248, 250, 252, 0.65))' }}
                    >
                      {filteredItems.length === 0 ? (
                        <div className="text-center py-6 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-400 dark:text-slate-500">
                          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          <p className="text-xs font-medium">
                            {searchQuery ? 'Tidak ada dokumen yang cocok dengan kata kunci pencarian.' : 'Belum ada dokumen yang diterbitkan pada kategori ini.'}
                          </p>
                          {onOpenFullLibrary && (
                            <button
                              type="button"
                              onClick={() => onOpenFullLibrary(category.docTypeKey)}
                              className="mt-2 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>Buka di Library Hub</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ) : (
                        filteredItems.map((doc) => {
                          const secStyle = SECTION_COLORS[doc.department] || {
                            bg: 'bg-slate-500/10 dark:bg-slate-800/40',
                            text: 'text-slate-700 dark:text-slate-300',
                            border: 'border-slate-300/60 dark:border-slate-700/60'
                          };

                          return (
                            <div
                              key={doc.raw.id}
                              onClick={() => onSelectPost(doc.raw)}
                              className="group p-3 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md hover:scale-[1.008] active:scale-[0.995] flex items-center justify-between gap-3 relative overflow-hidden"
                              style={{
                                backgroundColor: 'var(--card-bg, rgba(255, 255, 255, 0.95))',
                                borderColor: 'var(--border-main, rgba(148, 163, 184, 0.22))'
                              }}
                            >
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {doc.code && (
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border tracking-wider shrink-0 ${category.tagColor}`}>
                                      {doc.code}
                                    </span>
                                  )}
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border truncate max-w-[150px] shrink-0 ${secStyle.bg} ${secStyle.text} ${secStyle.border}`}>
                                    {doc.department}
                                  </span>
                                  {doc.dateStr && (
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono hidden sm:inline-block">
                                      {doc.dateStr}
                                    </span>
                                  )}
                                </div>

                                <h4 
                                  className="text-xs sm:text-sm font-bold tracking-tight line-clamp-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors"
                                  style={{ color: 'var(--text-main, #0f172a)' }}
                                >
                                  {doc.cleanTitle}
                                </h4>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 pl-1 text-slate-400 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors">
                                <span className="text-[11px] font-bold hidden sm:inline-block">Baca</span>
                                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            </div>
                          );
                        })
                      )}

                      {/* Footer Link to Full Category in Library Hub */}
                      {onOpenFullLibrary && filteredItems.length > 0 && (
                        <div className="pt-2 flex items-center justify-between px-1">
                          <span className="text-[11px] text-slate-400">
                            Menampilkan {filteredItems.length} dokumen
                          </span>
                          <button
                            type="button"
                            onClick={() => onOpenFullLibrary(category.docTypeKey)}
                            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Buka Semua {category.shortTitle} di Library Hub</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
