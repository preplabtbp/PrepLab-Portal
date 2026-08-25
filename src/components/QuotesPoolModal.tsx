import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Heart, Sparkles, Plus, Search, Quote, User, 
  Send, Shield, Check, Trash2, Layers, RefreshCw, ThumbsUp,
  MessageSquare, Flame, Clock, Award
} from 'lucide-react';
import { toast } from 'sonner';

export interface CommunityQuoteItem {
  id: number;
  quote: string;
  authorNik: string;
  authorName: string;
  authorRole?: string;
  authorSection?: string;
  category?: string;
  likesCount: number;
  likedBy: string[];
  likedByUsers?: Array<{
    nik: string;
    name: string;
    role?: string;
    likedAt?: string;
  }>;
  createdAt?: string | Date;
}

interface QuotesPoolModalProps {
  show: boolean;
  onClose: () => void;
  selectedQuote?: CommunityQuoteItem | null;
  initialTab?: 'details' | 'explore' | 'create';
  onSelectAsDailyQuote?: (quote: CommunityQuoteItem) => void;
  inspectorNik?: string | null;
  inspectorName?: string | null;
}

export default function QuotesPoolModal({
  show,
  onClose,
  selectedQuote,
  initialTab,
  onSelectAsDailyQuote,
  inspectorNik,
  inspectorName
}: QuotesPoolModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'explore' | 'create'>('details');
  const [quotesList, setQuotesList] = useState<CommunityQuoteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeDetailQuote, setActiveDetailQuote] = useState<CommunityQuoteItem | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'likes' | 'newest'>('likes');

  // New Quote Form State
  const [newQuoteText, setNewQuoteText] = useState('');
  const [newQuoteCategory, setNewQuoteCategory] = useState('Motivasi & Skena');
  const [submitting, setSubmitting] = useState(false);

  // User Profile
  const currentNik = inspectorNik || localStorage.getItem('p2h_inspector_nik') || 'general';
  const profile = useMemo(() => {
    try {
      const p = localStorage.getItem('p2h_inspector_profile');
      return p ? JSON.parse(p) : {};
    } catch (e) {
      return {};
    }
  }, []);
  const currentAuthorName = profile.name || profile.nama || inspectorName || localStorage.getItem('p2h_inspector_username') || 'Personil PrepLab';
  const currentRole = profile.jabatan || 'Staff';
  const currentSection = profile.section || profile.department || 'Prep & Lab';

  // Load Quotes from server
  const loadQuotes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/quotes');
      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.data)) {
        setQuotesList(json.data);
      }
    } catch (err) {
      console.warn("Gagal memuat pool quotes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (show) {
      loadQuotes();
      if (selectedQuote) {
        setActiveDetailQuote(selectedQuote);
      }
      if (initialTab) {
        setActiveTab(initialTab);
      } else if (selectedQuote) {
        setActiveTab('details');
      } else {
        setActiveTab('explore');
      }
    }
  }, [show, selectedQuote, initialTab]);

  // Keep activeDetailQuote synchronized with quotesList updates
  useEffect(() => {
    if (activeDetailQuote && quotesList.length > 0) {
      const updated = quotesList.find(q => q.id === activeDetailQuote.id);
      if (updated) setActiveDetailQuote(updated);
    }
  }, [quotesList]);

  if (!show) return null;

  // Toggle Like on Quote
  const handleToggleLike = async (quoteItem: CommunityQuoteItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!quoteItem.id) return;

    const wasLiked = (quoteItem.likedBy || []).includes(currentNik);
    const newLikesCount = wasLiked ? Math.max(0, (quoteItem.likesCount || 1) - 1) : (quoteItem.likesCount || 0) + 1;
    const newLikedBy = wasLiked 
      ? (quoteItem.likedBy || []).filter(n => n !== currentNik) 
      : [...(quoteItem.likedBy || []), currentNik];
    const newLikedByUsers = wasLiked
      ? (quoteItem.likedByUsers || []).filter(u => u.nik !== currentNik)
      : [...(quoteItem.likedByUsers || []), { nik: currentNik, name: currentAuthorName, role: currentRole }];

    const updatedObj = {
      ...quoteItem,
      likesCount: newLikesCount,
      likedBy: newLikedBy,
      likedByUsers: newLikedByUsers
    };

    // Optimistic UI Update
    setQuotesList(prev => prev.map(q => q.id === quoteItem.id ? updatedObj : q));
    if (activeDetailQuote && activeDetailQuote.id === quoteItem.id) {
      setActiveDetailQuote(updatedObj);
    }

    try {
      const res = await fetch(`/api/quotes/${quoteItem.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nik: currentNik,
          name: currentAuthorName,
          role: currentRole
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success(data.message || (data.isLiked ? 'Menyukai quote!' : 'Batal menyukai quote.'));
      }
    } catch (err) {
      // Rollback on failure
      loadQuotes();
      toast.error('Gagal memperbarui like quote');
    }
  };

  // Submit New Quote
  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuoteText.trim()) {
      toast.error('Tuliskan quote atau kata motivasi Anda!');
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading('Menambahkan quote ke pool bersama...');
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote: newQuoteText.trim(),
          authorNik: currentNik,
          authorName: currentAuthorName,
          authorRole: currentRole,
          authorSection: currentSection,
          category: newQuoteCategory
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success('Quote Anda berhasil dibagikan ke seluruh personil!', { id: toastId });
        setNewQuoteText('');
        await loadQuotes();
        if (data.data) {
          setActiveDetailQuote(data.data);
          setActiveTab('details');
        } else {
          setActiveTab('explore');
        }
      } else {
        toast.error(data.message || 'Gagal menyimpan quote', { id: toastId });
      }
    } catch (err) {
      toast.error('Terjadi kesalahan jaringan saat menyimpan quote', { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Quote (Author or Superadmin)
  const handleDeleteQuote = async (quoteId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Apakah Anda yakin ingin menghapus quote ini dari pool?')) return;

    try {
      const res = await fetch(`/api/quotes/${quoteId}?nik=${currentNik}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success('Quote berhasil dihapus');
        setQuotesList(prev => prev.filter(q => q.id !== quoteId));
        if (activeDetailQuote && activeDetailQuote.id === quoteId) {
          setActiveDetailQuote(null);
          setActiveTab('explore');
        }
      }
    } catch (err) {
      toast.error('Gagal menghapus quote');
    }
  };

  // Filtered & Sorted Quotes
  const filteredQuotes = useMemo(() => {
    return quotesList
      .filter(q => {
        if (selectedCategory !== 'all' && q.category !== selectedCategory) return false;
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          return (
            (q.quote || '').toLowerCase().includes(query) ||
            (q.authorName || '').toLowerCase().includes(query) ||
            (q.authorRole || '').toLowerCase().includes(query) ||
            (q.authorSection || '').toLowerCase().includes(query)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'likes') return (b.likesCount || 0) - (a.likesCount || 0);
        return (new Date(b.createdAt || 0).getTime()) - (new Date(a.createdAt || 0).getTime());
      });
  }, [quotesList, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-4xl h-[92vh] max-h-[850px] rounded-3xl border shadow-2xl flex flex-col overflow-hidden transition-all"
        style={{
          backgroundColor: 'var(--card-bg, #0F172A)',
          borderColor: 'var(--border-main, #334155)',
          color: 'var(--text-main, #F8FAFC)'
        }}
      >
        {/* Modal Top Header */}
        <div 
          className="px-5 py-4 border-b flex items-center justify-between select-none shrink-0"
          style={{
            backgroundColor: 'var(--bg-main, #1E293B)',
            borderColor: 'var(--border-main, #334155)'
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md shrink-0"
              style={{
                backgroundColor: 'var(--primary, #0D9488)',
                color: '#FFFFFF'
              }}
            >
              <Quote className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2 truncate">
                Pool Quotes & Inspirasi Harian
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/30">
                  {quotesList.length} Quotes
                </span>
              </h2>
              <p className="text-xs opacity-75 truncate hidden sm:block">
                Kumpulan kata motivasi, skena, dan pesan keselamatan dari dan untuk seluruh personil PrepLab.
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl transition-colors hover:bg-black/20 opacity-70 hover:opacity-100 cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div 
          className="flex border-b px-5 pt-2.5 gap-2 overflow-x-auto text-xs font-semibold select-none shrink-0 no-scrollbar"
          style={{
            backgroundColor: 'var(--bg-main, #1E293B)',
            borderColor: 'var(--border-main, #334155)'
          }}
        >
          {activeDetailQuote && (
            <button
              onClick={() => setActiveTab('details')}
              className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'details' 
                  ? 'border-current font-bold' 
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
              style={{ color: activeTab === 'details' ? 'var(--primary, #0D9488)' : 'inherit' }}
            >
              <Sparkles className="w-4 h-4" />
              <span>Detail & Likers</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('explore')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'explore' 
                ? 'border-current font-bold' 
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
            style={{ color: activeTab === 'explore' ? 'var(--primary, #0D9488)' : 'inherit' }}
          >
            <Layers className="w-4 h-4" />
            <span>Jelajahi Pool ({quotesList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('create')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'create' 
                ? 'border-current font-bold' 
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
            style={{ color: activeTab === 'create' ? 'var(--primary, #0D9488)' : 'inherit' }}
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Quote Saya</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-6">

          {/* TAB 1: DETAILS & LIKERS */}
          {activeTab === 'details' && activeDetailQuote && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Quote Hero Card */}
              <div 
                className="relative rounded-3xl p-6 sm:p-8 border shadow-xl backdrop-blur-xl overflow-hidden space-y-4"
                style={{
                  backgroundColor: 'var(--input-bg, rgba(255,255,255,0.03))',
                  borderColor: 'var(--border-main, rgba(255,255,255,0.1))'
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    {activeDetailQuote.category || 'Motivasi & Skena'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleToggleLike(activeDetailQuote, e)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border transition-all active:scale-95 cursor-pointer shadow-sm ${
                        (activeDetailQuote.likedBy || []).includes(currentNik)
                          ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                          : 'bg-black/10 hover:bg-rose-500/15 hover:text-rose-400 border-white/10 opacity-85 hover:opacity-100'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${((activeDetailQuote.likedBy || []).includes(currentNik)) ? 'fill-rose-500 text-rose-500' : ''}`} />
                      <span>{activeDetailQuote.likesCount || 0} Menyukai</span>
                    </button>

                    {onSelectAsDailyQuote && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectAsDailyQuote(activeDetailQuote);
                          toast.success('Quote ini dijadikan Quote Tampilan Utama Anda!');
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all active:scale-95 cursor-pointer shadow-sm text-white"
                        style={{
                          backgroundColor: 'var(--primary, #0D9488)',
                          borderColor: 'transparent'
                        }}
                        title="Terapkan sebagai quote di halaman beranda"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Pakai Hari Ini</span>
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-lg sm:text-2xl font-medium italic leading-relaxed text-current">
                  "{activeDetailQuote.quote}"
                </p>

                {/* Creator Attribution */}
                <div 
                  className="pt-4 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  style={{ borderColor: 'var(--border-main, rgba(255,255,255,0.1))' }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm text-white shadow-xs shrink-0"
                      style={{ backgroundColor: 'var(--primary, #0D9488)' }}
                    >
                      {(activeDetailQuote.authorName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-sm leading-tight">
                        {activeDetailQuote.authorName || 'Personil PrepLab'}
                      </p>
                      <p className="opacity-70 text-[11px]">
                        {activeDetailQuote.authorRole || 'Staff'} • {activeDetailQuote.authorSection || 'PrepLab'}
                        {activeDetailQuote.authorNik && activeDetailQuote.authorNik !== '00000000000' && (
                          <span className="font-mono ml-1 opacity-60">({activeDetailQuote.authorNik})</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {activeDetailQuote.createdAt && (
                    <div className="text-[11px] opacity-60 font-mono">
                      Ditambahkan: {new Date(activeDetailQuote.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  )}
                </div>
              </div>

              {/* Likers List Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                    Personil Yang Menyukai ({activeDetailQuote.likesCount || 0})
                  </h3>
                </div>

                {(!activeDetailQuote.likedByUsers || activeDetailQuote.likedByUsers.length === 0) ? (
                  <div 
                    className="p-6 rounded-2xl border border-dashed text-center space-y-2"
                    style={{ borderColor: 'var(--border-main)' }}
                  >
                    <Heart className="w-7 h-7 mx-auto opacity-30 text-rose-400" />
                    <p className="text-xs font-medium opacity-70">
                      Belum ada personil yang menyukai quote ini. Jadilah yang pertama memberikan like!
                    </p>
                    <button
                      type="button"
                      onClick={(e) => handleToggleLike(activeDetailQuote, e)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-rose-400 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 transition-all cursor-pointer"
                    >
                      Beri Like Sekarang ❤️
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {activeDetailQuote.likedByUsers.map((user, idx) => (
                      <div 
                        key={`liker-${idx}`}
                        className="p-3 rounded-2xl border flex items-center gap-2.5 shadow-2xs"
                        style={{
                          backgroundColor: 'var(--input-bg)',
                          borderColor: 'var(--border-main)'
                        }}
                      >
                        <div 
                          className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0"
                          style={{ backgroundColor: 'var(--primary)' }}
                        >
                          {(user.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs truncate">{user.name || 'Personil'}</p>
                          <p className="text-[10px] opacity-65 truncate">{user.role || 'Staff'}</p>
                        </div>
                        <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: EXPLORE QUOTES POOL */}
          {activeTab === 'explore' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              {/* Filter, Search & Sort Bar */}
              <div 
                className="p-3.5 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs"
                style={{
                  backgroundColor: 'var(--bg-main)',
                  borderColor: 'var(--border-main)'
                }}
              >
                {/* Category Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { key: 'all', label: 'Semua' },
                    { key: 'Motivasi & Skena', label: 'Motivasi & Skena' },
                    { key: 'Safety K3 & 5R', label: 'Safety & 5R' },
                    { key: 'Teknis & Analisa', label: 'Teknis Lab' }
                  ].map(cat => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setSelectedCategory(cat.key)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        selectedCategory === cat.key
                          ? 'font-bold text-white shadow-xs'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: selectedCategory === cat.key ? 'var(--primary)' : 'var(--card-bg)',
                        borderColor: 'var(--border-main)',
                        color: selectedCategory === cat.key ? '#FFFFFF' : 'inherit'
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Search & Sort Controls */}
                <div className="flex items-center gap-2 flex-1 sm:max-w-md">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                    <input
                      type="text"
                      placeholder="Cari quote / nama pembuat..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border outline-none font-medium"
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        borderColor: 'var(--border-main)',
                        color: 'var(--text-main)'
                      }}
                    />
                  </div>

                  <select
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="text-xs px-2.5 py-1.5 rounded-xl border outline-none font-semibold cursor-pointer shrink-0"
                    style={{
                      backgroundColor: 'var(--input-bg)',
                      borderColor: 'var(--border-main)',
                      color: 'var(--text-main)'
                    }}
                  >
                    <option value="likes">❤️ Terbanyak Disukai</option>
                    <option value="newest">⏱️ Terbaru</option>
                  </select>
                </div>
              </div>

              {/* Quotes Grid */}
              {filteredQuotes.length === 0 ? (
                <div 
                  className="p-10 rounded-2xl border border-dashed text-center space-y-3"
                  style={{ borderColor: 'var(--border-main)' }}
                >
                  <Quote className="w-10 h-10 mx-auto opacity-30 text-amber-400" />
                  <p className="text-sm font-semibold">Tidak ada quote yang cocok dengan pencarian Anda.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('create')}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
                    style={{ backgroundColor: 'var(--primary)' }}
                  >
                    <Plus className="w-4 h-4" />
                    Tulis Quote Baru
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredQuotes.map(q => {
                    const isOwnQuote = q.authorNik === currentNik;
                    const isLiked = (q.likedBy || []).includes(currentNik);

                    return (
                      <div 
                        key={`quote-card-${q.id}`}
                        onClick={() => {
                          setActiveDetailQuote(q);
                          setActiveTab('details');
                        }}
                        className="p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between gap-3.5 shadow-2xs hover:shadow-md cursor-pointer hover:border-teal-500/50 group relative"
                        style={{
                          backgroundColor: 'var(--input-bg)',
                          borderColor: 'var(--border-main)'
                        }}
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              {q.category || 'Motivasi & Skena'}
                            </span>

                            <div className="flex items-center gap-1.5">
                              {/* Like Button */}
                              <button
                                type="button"
                                onClick={(e) => handleToggleLike(q, e)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                                  isLiked 
                                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' 
                                    : 'bg-black/5 hover:bg-rose-500/15 hover:text-rose-400 border-black/10 opacity-75 hover:opacity-100'
                                }`}
                                title={`${q.likesCount || 0} personil menyukai quote ini`}
                              >
                                <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                                <span>{q.likesCount || 0}</span>
                              </button>

                              {isOwnQuote && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteQuote(q.id, e)}
                                  className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                                  title="Hapus quote saya"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-sm font-medium italic leading-relaxed text-current line-clamp-3">
                            "{q.quote}"
                          </p>
                        </div>

                        <div 
                          className="pt-2.5 border-t flex items-center justify-between text-xs"
                          style={{ borderColor: 'var(--border-main, rgba(255,255,255,0.06))' }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div 
                              className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] text-white shrink-0"
                              style={{ backgroundColor: 'var(--primary)' }}
                            >
                              {(q.authorName || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-xs truncate">{q.authorName || 'Personil PrepLab'}</p>
                              <p className="text-[10px] opacity-60 truncate">{q.authorRole || 'Staff'}</p>
                            </div>
                          </div>

                          <span className="text-[11px] font-semibold text-teal-400 opacity-80 group-hover:opacity-100 flex items-center gap-1 shrink-0">
                            Detail & Likers →
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CREATE NEW QUOTE */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateQuote} className="max-w-xl mx-auto space-y-5 animate-in fade-in duration-150">
              <div className="text-center space-y-1.5">
                <div 
                  className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center font-bold shadow-md"
                  style={{ backgroundColor: 'var(--primary)', color: '#FFFFFF' }}
                >
                  <Plus className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold">Bagikan Quote & Kata Motivasi Anda</h3>
                <p className="text-xs opacity-75">
                  Quote Anda akan masuk ke dalam Pool Quotes PrepLab dan dapat muncul di layar sapaan seluruh rekan kerja!
                </p>
              </div>

              {/* Author Identity Summary Badge */}
              <div 
                className="p-3.5 rounded-2xl border flex items-center gap-3 shadow-2xs"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border-main)'
                }}
              >
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs shrink-0"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  {currentAuthorName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate">{currentAuthorName}</p>
                  <p className="text-[11px] opacity-70 truncate font-mono">
                    NIK: {currentNik} • {currentRole} • {currentSection}
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30 shrink-0">
                  Pembuat
                </span>
              </div>

              {/* Category Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold">Kategori Quote</label>
                <select
                  value={newQuoteCategory}
                  onChange={e => setNewQuoteCategory(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border outline-none font-medium"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border-main)',
                    color: 'var(--text-main)'
                  }}
                >
                  <option value="Motivasi & Skena">☕ Motivasi & Skena Harian</option>
                  <option value="Safety K3 & 5R">🛡️ Keselamatan Kerja (K3) & 5R</option>
                  <option value="Teknis & Analisa">🔬 Semangat Teknis & Mutu Analisa</option>
                  <option value="Humor & Semangat">😄 Humor & Kekompakan Shift</option>
                </select>
              </div>

              {/* Quote Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold">Isi Quote / Kata Mutiara</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Contoh: Awali shift dengan bismillah dan APD lengkap. Kerjaan rapi, data presisi, pulang selamat!"
                  value={newQuoteText}
                  onChange={e => setNewQuoteText(e.target.value)}
                  className="w-full text-sm p-4 rounded-2xl border outline-none leading-relaxed font-medium"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--border-main)',
                    color: 'var(--text-main)'
                  }}
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('explore')}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-bold border opacity-80 hover:opacity-100 transition-colors cursor-pointer"
                  style={{ borderColor: 'var(--border-main)' }}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={submitting || !newQuoteText.trim()}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim ke Pool Quotes</span>
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
