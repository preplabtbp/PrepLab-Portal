import React, { useState, useMemo } from 'react';
import { 
  BookOpen, ShieldAlert, FileText, CheckCircle2, AlertTriangle, 
  Search, Plus, Filter, Clock, Building2, Sparkles, X, 
  ChevronRight, Download, Eye, Tag, Award, ShieldCheck, Flame, FlaskConical
} from 'lucide-react';
import { toast } from 'sonner';

export type LibraryDocType = 'ALL' | 'SAFETY_FLASH' | 'SOP' | 'JSA' | 'IK' | 'MSDS';

interface CompanyLibraryHubProps {
  posts: any[];
  onSelectPost: (post: any) => void;
  onRefreshPosts: () => void;
  activeUniverse?: string;
  inspectorNik?: string;
  inspectorName?: string;
  userRole?: string;
  initialTypeFilter?: LibraryDocType;
}

const DOC_TYPES: { id: LibraryDocType; label: string; icon: string; desc: string; color: string; border: string }[] = [
  { id: 'ALL', label: 'Semua Dokumen', icon: '📚', desc: 'Seluruh repositori dokumen resmi & K3', color: 'from-slate-800 to-slate-900', border: 'border-slate-700' },
  { id: 'SAFETY_FLASH', label: 'Safety Flash', icon: '🚨', desc: 'Peringatan kilat & memo keselamatan dari tim HSE', color: 'from-rose-950/80 to-slate-900', border: 'border-rose-600/50' },
  { id: 'SOP', label: 'SOP Operasional', icon: '📘', desc: 'Standar Operasional Prosedur kerja menyeluruh', color: 'from-sky-950/80 to-slate-900', border: 'border-sky-500/50' },
  { id: 'JSA', label: 'Job Safety Analysis', icon: '🛡️', desc: 'Analisis potensi bahaya & langkah pengendalian K3', color: 'from-emerald-950/80 to-slate-900', border: 'border-emerald-500/50' },
  { id: 'IK', label: 'Instruksi Kerja (IK)', icon: '📋', desc: 'Panduan teknis langkah-demi-langkah alat & uji', color: 'from-amber-950/80 to-slate-900', border: 'border-amber-500/50' },
  { id: 'MSDS', label: 'MSDS / Bahan B3', icon: '🧪', desc: 'Lembar keselamatan bahan kimia berbahaya & reagen', color: 'from-purple-950/80 to-slate-900', border: 'border-purple-500/50' },
];

const SECTIONS = [
  'ALL',
  'Sample Preparation',
  'Wet Laboratory',
  'XRF & Instrumentasi',
  'HSE & K3LH',
  'Quality Assurance',
  'Administrasi & Umum'
];

export const CompanyLibraryHub: React.FC<CompanyLibraryHubProps> = ({
  posts,
  onSelectPost,
  onRefreshPosts,
  activeUniverse = 'TBP',
  inspectorNik = '',
  inspectorName = 'Personil',
  userRole = '',
  initialTypeFilter = 'ALL'
}) => {
  const [selectedType, setSelectedType] = useState<LibraryDocType>(initialTypeFilter);
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Form State for creating new Official Document
  const [newDocType, setNewDocType] = useState<'SOP' | 'JSA' | 'IK' | 'SAFETY_FLASH' | 'MSDS'>('SOP');
  const [newDocCode, setNewDocCode] = useState<string>('');
  const [newDocTitle, setNewDocTitle] = useState<string>('');
  const [newDocSection, setNewDocSection] = useState<string>('Sample Preparation');
  const [newDocRevision, setNewDocRevision] = useState<string>('Rev. 00');
  const [newDocSummary, setNewDocSummary] = useState<string>('');
  const [newDocContent, setNewDocContent] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filter Library Documents from Posts
  const libraryDocs = useMemo(() => {
    return posts.filter((p) => {
      const cat = (p.category || '').toUpperCase();
      const dept = (p.department || '').toUpperCase();
      const tags: string[] = Array.isArray(p.tags) ? p.tags.map((t: string) => String(t).toUpperCase()) : [];

      const isLibrary = 
        cat.startsWith('LIBRARY') ||
        ['SOP', 'JSA', 'IK', 'SAFETY_FLASH', 'MSDS', 'STANDAR', 'PROCEDURE'].includes(cat) ||
        tags.some(t => ['LIBRARY', 'SOP', 'JSA', 'IK', 'SAFETY_FLASH', 'MSDS'].includes(t)) ||
        dept === 'LIBRARY' ||
        dept.includes('HSE');

      if (!isLibrary) return false;

      // Filter by Document Type
      if (selectedType !== 'ALL') {
        const matchesType = 
          cat.includes(selectedType) || 
          tags.includes(selectedType) || 
          (selectedType === 'SAFETY_FLASH' && (cat.includes('SAFETY') || cat.includes('FLASH')));
        if (!matchesType) return false;
      }

      // Filter by Section
      if (selectedSection !== 'ALL') {
        const docDept = p.department || '';
        if (!docDept.toLowerCase().includes(selectedSection.toLowerCase())) return false;
      }

      // Filter by Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (p.title || '').toLowerCase().includes(q);
        const contentMatch = (p.content || '').toLowerCase().includes(q);
        const deptMatch = (p.department || '').toLowerCase().includes(q);
        const catMatch = (p.category || '').toLowerCase().includes(q);
        if (!titleMatch && !contentMatch && !deptMatch && !catMatch) return false;
      }

      return true;
    });
  }, [posts, selectedType, selectedSection, searchQuery]);

  // Safety Flash Items (Pinned Highlights)
  const safetyFlashHighlights = useMemo(() => {
    return posts.filter((p) => {
      const cat = (p.category || '').toUpperCase();
      const tags: string[] = Array.isArray(p.tags) ? p.tags.map((t: string) => String(t).toUpperCase()) : [];
      return cat.includes('SAFETY_FLASH') || cat.includes('FLASH') || tags.includes('SAFETY_FLASH');
    }).slice(0, 3);
  }, [posts]);

  // Document Counts
  const counts = useMemo(() => {
    let sopCount = 0;
    let jsaCount = 0;
    let ikCount = 0;
    let safetyFlashCount = 0;
    let msdsCount = 0;

    posts.forEach((p) => {
      const cat = (p.category || '').toUpperCase();
      const tags: string[] = Array.isArray(p.tags) ? p.tags.map((t: string) => String(t).toUpperCase()) : [];
      if (cat.includes('SOP') || tags.includes('SOP')) sopCount++;
      if (cat.includes('JSA') || tags.includes('JSA')) jsaCount++;
      if (cat.includes('IK') || tags.includes('IK')) ikCount++;
      if (cat.includes('SAFETY_FLASH') || cat.includes('FLASH') || tags.includes('SAFETY_FLASH')) safetyFlashCount++;
      if (cat.includes('MSDS') || tags.includes('MSDS')) msdsCount++;
    });

    return {
      all: libraryDocs.length,
      sop: sopCount,
      jsa: jsaCount,
      ik: ikCount,
      safetyFlash: safetyFlashCount,
      msds: msdsCount
    };
  }, [posts, libraryDocs]);

  // Handle Publish New Official Document
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim() || !newDocContent.trim()) {
      toast.error('Judul dan isi dokumen wajib diisi!');
      return;
    }

    setIsSubmitting(true);
    toast.loading('Menerbitkan dokumen ke Library...', { id: 'create-doc' });

    try {
      const finalTitle = newDocCode.trim() 
        ? `[${newDocCode.trim()}] ${newDocTitle.trim()}`
        : newDocTitle.trim();

      const docBody = `
> [!NOTE]
> **DOKUMEN RESMI PREPLAB PERUSAHAAN**  
> **Nomor Dokumen**: ${newDocCode.trim() || 'TBA'} | **Status**: 🟢 Aktif / Berlaku | **Revisi**: ${newDocRevision}  
> **Seksi Pemilik**: ${newDocSection} | **Tanggal Efektif**: ${new Date().toLocaleDateString('id-ID')}

${newDocSummary.trim() ? `### Ringkasan & Ruang Lingkup\n${newDocSummary.trim()}\n\n---\n` : ''}

${newDocContent.trim()}
      `.trim();

      const res = await fetch('/api/bulletin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: newDocSection,
          category: `LIBRARY_${newDocType}`,
          title: finalTitle,
          content: docBody,
          pt: activeUniverse || 'TBP',
          authorNik: inspectorNik,
          authorName: inspectorName,
          tags: ['LIBRARY', newDocType, newDocSection, newDocRevision]
        })
      });

      if (!res.ok) throw new Error('Gagal menyimpan dokumen');

      toast.success('Dokumen resmi berhasil diterbitkan ke Library!', { id: 'create-doc' });
      setShowCreateModal(false);
      setNewDocCode('');
      setNewDocTitle('');
      setNewDocSummary('');
      setNewDocContent('');
      onRefreshPosts();
    } catch (err: any) {
      toast.error(`Gagal menerbitkan dokumen: ${err.message}`, { id: 'create-doc' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-24 animate-in fade-in duration-200">
      
      {/* ── HEADER BANNER ── */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.15)] overflow-hidden">
        {/* Decorative Watermark */}
        <div className="absolute -right-6 -bottom-8 text-9xl select-none opacity-5 pointer-events-none font-black text-amber-300">
          📚
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold tracking-wider uppercase">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              Company Library &bull; Single Source of Truth
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>Pusat Dokumen Resmi & K3 Perusahaan</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Repositori digital baku untuk seluruh Standard Operating Procedure (SOP), Job Safety Analysis (JSA), Instruksi Kerja (IK), Safety Flash, dan Lembar Data Keselamatan (SDS/MSDS) Laboratorium Preparasi.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 border-2 border-amber-400"
            >
              <Plus className="w-4 h-4 font-black" />
              <span>Terbitkan Dokumen Baru</span>
            </button>
          </div>
        </div>

        {/* Quick Document Counter Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold">Total Dokumen</span>
            <span className="text-xl font-black text-white">{counts.all}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-rose-900/40">
            <span className="text-[10px] font-mono text-rose-400 block uppercase font-bold flex items-center gap-1">
              <span>🚨</span> Safety Flash
            </span>
            <span className="text-xl font-black text-rose-300">{counts.safetyFlash}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-sky-900/40">
            <span className="text-[10px] font-mono text-sky-400 block uppercase font-bold flex items-center gap-1">
              <span>📘</span> SOP Standar
            </span>
            <span className="text-xl font-black text-sky-300">{counts.sop}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-emerald-900/40">
            <span className="text-[10px] font-mono text-emerald-400 block uppercase font-bold flex items-center gap-1">
              <span>🛡️</span> JSA K3
            </span>
            <span className="text-xl font-black text-emerald-300">{counts.jsa}</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-amber-900/40 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-mono text-amber-400 block uppercase font-bold flex items-center gap-1">
              <span>📋</span> Instruksi Kerja
            </span>
            <span className="text-xl font-black text-amber-300">{counts.ik}</span>
          </div>
        </div>
      </div>

      {/* ── SAFETY FLASH HIGHLIGHTS (If any exist) ── */}
      {safetyFlashHighlights.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
            <h2 className="text-sm font-black text-white uppercase tracking-wider font-mono">
              Safety Flash & Memo K3 Terkini
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {safetyFlashHighlights.map((sf) => (
              <div
                key={sf.id}
                onClick={() => onSelectPost(sf)}
                className="p-4 rounded-2xl bg-gradient-to-br from-rose-950/70 via-slate-900 to-slate-950 border-2 border-rose-500/50 hover:border-rose-400 transition-all cursor-pointer shadow-lg hover:shadow-rose-950/50 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-rose-900/80 text-rose-200 border border-rose-500 font-bold font-mono">
                      🚨 SAFETY ALERT
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {sf.createdAt ? new Date(sf.createdAt).toLocaleDateString('id-ID') : 'Baru'}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-white group-hover:text-rose-300 transition-colors line-clamp-2 mb-2">
                    {sf.title}
                  </h3>
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {sf.content?.replace(/[#*`>]/g, '').slice(0, 110)}...
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-rose-900/40 flex items-center justify-between text-xs font-bold text-rose-400">
                  <span>Pelajari Rincian K3</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SEARCH & FILTER CONTROLS ── */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
        {/* Search Bar & Section Dropdown */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 relative w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari dokumen resmi... (nomor dokumen, judul SOP, alat, bahaya, bahan kimia)"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs sm:text-sm font-medium focus:border-amber-400 focus:outline-hidden transition-colors placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-slate-200 focus:border-amber-400 focus:outline-hidden cursor-pointer w-full sm:w-auto"
            >
              <option value="ALL">Semua Seksi / Departemen</option>
              {SECTIONS.filter(s => s !== 'ALL').map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {DOC_TYPES.map((type) => {
            const isActive = selectedType === type.id;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => setSelectedType(type.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black border border-amber-400'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                <span>{type.icon}</span>
                <span>{type.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── DOCUMENTS GRID ── */}
      {libraryDocs.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-slate-900/50 border border-dashed border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl mx-auto">
            📚
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-white">Belum Ada Dokumen di Kategori Ini</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Tidak ada dokumen SOP, JSA, IK, atau Safety Flash yang cocok dengan filter pencarian Anda. Silakan terbitkan dokumen baru atau ubah kata kunci.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4 font-black" />
            <span>Terbitkan Dokumen Sekarang</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {libraryDocs.map((doc) => {
            const cat = (doc.category || '').toUpperCase();
            const isSF = cat.includes('SAFETY') || cat.includes('FLASH');
            const isSOP = cat.includes('SOP');
            const isJSA = cat.includes('JSA');
            const isIK = cat.includes('IK');
            const isMSDS = cat.includes('MSDS');

            const badgeBg = isSF ? 'bg-rose-950/80 text-rose-300 border-rose-500/50'
              : isSOP ? 'bg-sky-950/80 text-sky-300 border-sky-500/50'
              : isJSA ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
              : isIK ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
              : 'bg-purple-950/80 text-purple-300 border-purple-500/50';

            const badgeLabel = isSF ? '🚨 SAFETY FLASH'
              : isSOP ? '📘 SOP OPERASIONAL'
              : isJSA ? '🛡️ JOB SAFETY ANALYSIS'
              : isIK ? '📋 INSTRUKSI KERJA'
              : isMSDS ? '🧪 LEMBAR MSDS'
              : '📚 DOKUMEN RESMI';

            return (
              <div
                key={doc.id}
                onClick={() => onSelectPost(doc)}
                className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/60 transition-all cursor-pointer shadow-md hover:shadow-[0_0_30px_rgba(245,158,11,0.12)] group flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono border ${badgeBg}`}>
                      {badgeLabel}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('id-ID') : 'Aktif'}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-black text-white group-hover:text-amber-300 transition-colors line-clamp-2">
                    {doc.title}
                  </h3>

                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {doc.content?.replace(/[#*`>]/g, '').slice(0, 140)}...
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                    <Building2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>{doc.department || 'Prep & Lab'}</span>
                  </div>

                  <span className="font-bold text-amber-400 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                    <span>Buka Dokumen</span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL: TERBITKAN DOKUMEN RESMI BARU ── */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl bg-slate-950 border-2 border-amber-500/60 p-5 sm:p-7 text-slate-100 shadow-[0_0_50px_rgba(245,158,11,0.25)] space-y-5 my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">📋</span>
                <div>
                  <h3 className="text-base font-black text-white">Terbitkan Dokumen Resmi Baru</h3>
                  <p className="text-xs text-slate-400">Tambahkan SOP, JSA, IK, Safety Flash atau MSDS ke repositori resmi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="space-y-4">
              {/* Type & Section Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Jenis Dokumen <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={newDocType}
                    onChange={(e: any) => setNewDocType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:border-amber-400 focus:outline-hidden cursor-pointer"
                  >
                    <option value="SOP">📘 SOP (Standard Operating Procedure)</option>
                    <option value="JSA">🛡️ JSA (Job Safety Analysis)</option>
                    <option value="IK">📋 IK (Instruksi Kerja)</option>
                    <option value="SAFETY_FLASH">🚨 Safety Flash (Peringatan Keselamatan)</option>
                    <option value="MSDS">🧪 MSDS / SDS (Lembar Keselamatan Bahan B3)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Seksi / Departemen Terkait <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={newDocSection}
                    onChange={(e) => setNewDocSection(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:border-amber-400 focus:outline-hidden cursor-pointer"
                  >
                    {SECTIONS.filter(s => s !== 'ALL').map(sec => (
                      <option key={sec} value={sec}>{sec}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Document Code & Revision */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Nomor Dokumen (Opsional)
                  </label>
                  <input
                    type="text"
                    value={newDocCode}
                    onChange={(e) => setNewDocCode(e.target.value)}
                    placeholder="Contoh: SOP-PREP-001 atau SF-2026-04"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:border-amber-400 focus:outline-hidden placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Nomor Revisi
                  </label>
                  <input
                    type="text"
                    value={newDocRevision}
                    onChange={(e) => setNewDocRevision(e.target.value)}
                    placeholder="Contoh: Rev. 00 / 01"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:border-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Judul Dokumen Resmi <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="Contoh: Prosedur Pengoperasian Jaw Crusher & Pulverizer Standar K3"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm font-bold text-white focus:border-amber-400 focus:outline-hidden placeholder:text-slate-500"
                  required
                />
              </div>

              {/* Summary / K3 Highlights */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Ringkasan / Poin Kunci K3
                </label>
                <textarea
                  value={newDocSummary}
                  onChange={(e) => setNewDocSummary(e.target.value)}
                  rows={2}
                  placeholder="Ringkasan singkat tujuan, bahaya utama yang diwaspadai, atau APD wajib..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:border-amber-400 focus:outline-hidden resize-none placeholder:text-slate-500"
                />
              </div>

              {/* Full Content */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Isi Lengkap Dokumen / Langkah Prosedur <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={newDocContent}
                  onChange={(e) => setNewDocContent(e.target.value)}
                  rows={8}
                  placeholder="Ketik isi prosedur, urutan langkah kerja, alat pelindung diri, mitigasi bahaya, atau panduan teknis..."
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:border-amber-400 focus:outline-hidden placeholder:text-slate-500"
                  required
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs cursor-pointer shadow-lg active:scale-95 transition-all"
                >
                  {isSubmitting ? 'Menerbitkan...' : 'Terbitkan ke Library 📚'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
