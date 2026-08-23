import { toast } from 'sonner';
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Input, Textarea, Select } from './ui';
import { getTickets, closeTicket, getGalleryPhotos } from '../sheets-api';
import { 
  Loader2, AlertTriangle, CheckCircle2, ShieldCheck, Image as ImageIcon, 
  Camera, User, Calendar as CalendarIcon, Tag, ZoomIn, Filter, Layers, 
  ChevronRight, ArrowLeft, RefreshCw 
} from 'lucide-react';
import { ImageModal } from './image-modal';
import { WhatsAppModal } from './whatsapp-modal';
import { DevModeAccordion, useDevOptions } from './dev-mode-accordion';
import { PageHeader } from './PageHeader';

const formatImageUrl = (url: string) => {
  if (!url || url === '-') return null;
  let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)\//);
  if (match) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
  }
  match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
  }
  return url;
};

export function TicketScreen({ inspectorName, inspectorNik }: { inspectorName: string, inspectorNik: string }) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('OPEN');
  
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [closingNotes, setClosingNotes] = useState('');
  const [closingPhoto, setClosingPhoto] = useState<{ url: string, file: File, base64: string } | null>(null);
  const [waMessageToModal, setWaMessageToModal] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  
  // Gallery states
  const [showGallery, setShowGallery] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<any[]>([]);
  const [availableGalleryWeeks, setAvailableGalleryWeeks] = useState<string[]>([]);
  const [totalGalleryPhotosCount, setTotalGalleryPhotosCount] = useState<number>(0);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [selectedGalleryWeek, setSelectedGalleryWeek] = useState<string>('');
  const [selectedGalleryCategory, setSelectedGalleryCategory] = useState<string>('ALL');

  const { devOptions, setDevOptions, parsedDevOptions } = useDevOptions(inspectorNik);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await getTickets(filter);
      setTickets(data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTickets();
  }, [filter]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      const reader = new FileReader();
      reader.onload = (event) => {
         setClosingPhoto({ url, file, base64: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const submitClose = async () => {
    if (!selectedTicket) return;
    if (!closingNotes.trim()) {
      toast.error("Deskripsi perbaikan wajib diisi.");
      return;
    }
    if (!closingPhoto) {
      toast.error("Foto bukti perbaikan wajib diunggah.");
      return;
    }
    
    setIsClosing(true);
    try {
      const res = await closeTicket(selectedTicket.ticketId, inspectorName, closingPhoto.base64, closingNotes, parsedDevOptions);
      setSelectedTicket(null);
      setClosingNotes('');
      setClosingPhoto(null);
      await loadTickets();
      if (res && res.waMessageText) {
          setWaMessageToModal(res.waMessageText);
      } else {
          toast.success('Tiket berhasil ditutup!');
      }
    } catch(e) {
      console.error(e);
      toast.error("Gagal menutup tiket");
    }
    setIsClosing(false);
  };

  const fetchWeekGallery = async (targetWeek?: string, forceRefresh?: boolean) => {
    setLoadingGallery(true);
    try {
       const res = await getGalleryPhotos(targetWeek, forceRefresh);
       const photosList = Array.isArray(res) ? res : (res?.photos || []);
       const weeksList = res?.availableWeeks || [];
       const totalCount = res?.totalPhotos || photosList.length;
       const activeWeek = res?.currentWeek || targetWeek || weeksList[0] || '';

       setGalleryPhotos(photosList);
       if (weeksList.length > 0) setAvailableGalleryWeeks(weeksList);
       setTotalGalleryPhotosCount(totalCount);
       setSelectedGalleryWeek(activeWeek);
    } catch(e) {
       console.error("Gagal load galeri", e);
    }
    setLoadingGallery(false);
  };

  const loadGallery = async () => {
    setShowGallery(true);
    await fetchWeekGallery();
  };

  // Group tickets by Week
  const groupedTickets = useMemo(() => {
    return tickets.reduce((acc: any, t: any) => {
      const match = (t.ticketId || '').match(/W(\d+)Y(\d+)/);
      let weekLabel = "Minggu Lainnya";
      let sortKey = "000000";
      if (match) {
        let w = match[1];
        let y = "20" + match[2];
        weekLabel = "Minggu ke-" + w + " (Tahun " + y + ")";
        sortKey = y + w.padStart(2, '0');
      }
      if (!acc[sortKey]) acc[sortKey] = { label: weekLabel, tickets: [] };
      acc[sortKey].tickets.push(t);
      return acc;
    }, {});
  }, [tickets]);

  const sortedKeys = Object.keys(groupedTickets).sort((a,b) => b.localeCompare(a));

  // Gallery Filters & Categorization
  const availableCategoriesInWeek = useMemo(() => {
    const catCountMap = new Map<string, number>();
    galleryPhotos.forEach(p => {
      const cat = p.sumber || 'Inspeksi Umum';
      catCountMap.set(cat, (catCountMap.get(cat) || 0) + 1);
    });
    return catCountMap;
  }, [galleryPhotos]);

  const filteredGalleryPhotos = useMemo(() => {
    return galleryPhotos.filter(p => {
      return selectedGalleryCategory === 'ALL' || (p.sumber || 'Inspeksi Umum') === selectedGalleryCategory;
    });
  }, [galleryPhotos, selectedGalleryCategory]);

  const galleryGroupedByCategory = useMemo(() => {
    return filteredGalleryPhotos.reduce((acc: any, p: any) => {
      const cat = p.sumber || 'Inspeksi Umum';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(p);
      return acc;
    }, {});
  }, [filteredGalleryPhotos]);

  if (showGallery) {
    return (
      <div className="space-y-6 animate-in fade-in pb-20 max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <PageHeader 
          title="Galeri Dokumentasi Inspeksi"
          description="Koleksi foto dokumentasi proses & temuan inspeksi per minggu"
          icon={<ImageIcon className="w-6 h-6 text-teal-600" />}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchWeekGallery(selectedGalleryWeek, true);
                toast.success("Galeri berhasil diperbarui");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingGallery ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowGallery(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Tiket</span>
            </button>
          </div>
        </PageHeader>

        {/* QA Weekly Presentation Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-5 rounded-2xl border border-teal-900/50 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-teal-500/20 text-teal-300 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider border border-teal-500/30">
                QA Weekly Presentation Mode
              </span>
              <span className="text-slate-400 text-xs font-medium">
                {selectedGalleryWeek === 'ALL' ? 'Semua Minggu' : selectedGalleryWeek}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white">Dokumentasi Visual Hasil Inspeksi</h3>
            <p className="text-xs text-slate-300">
              Gunakan tombol <span className="font-semibold text-teal-300">Salin Link</span> untuk menyalin URL foto beresolusi tinggi langsung ke slide presentasi PowerPoint / Google Slides Anda.
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10 shrink-0">
            <div className="text-center px-2">
              <p className="text-2xl font-black text-teal-400">{filteredGalleryPhotos.length}</p>
              <p className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Total Foto</p>
            </div>
            <div className="w-[1px] h-8 bg-white/20" />
            <div className="text-center px-2">
              <p className="text-2xl font-black text-amber-400">{Object.keys(galleryGroupedByCategory).length}</p>
              <p className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Kategori Form</p>
            </div>
          </div>
        </div>

        {/* Gallery Filters Bar */}
        <Card className="p-4 sm:p-5 bg-white shadow-sm border border-slate-200 rounded-2xl space-y-4">
          {/* Top Row: Week Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-1">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                <CalendarIcon className="w-4 h-4 text-teal-600" />
                <span>Pilih Minggu:</span>
              </label>
              <div className="relative flex-1 max-w-md">
                <select
                  value={selectedGalleryWeek}
                  onChange={(e) => {
                    const newWk = e.target.value;
                    setSelectedGalleryCategory('ALL');
                    fetchWeekGallery(newWk);
                  }}
                  className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-300 text-slate-800 text-sm font-semibold rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all cursor-pointer shadow-sm"
                >
                  {availableGalleryWeeks.map((wk, idx) => (
                    <option key={wk} value={wk}>
                      {idx === 0 ? `⭐ ${wk} (Minggu Berjalan)` : wk}
                    </option>
                  ))}
                  <option value="ALL">Semua Minggu ({totalGalleryPhotosCount || '927'} Foto)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs font-medium text-slate-500">
                Menampilkan <strong className="text-teal-700 font-bold">{filteredGalleryPhotos.length}</strong> foto pada minggu ini
              </span>
            </div>
          </div>

          {/* Bottom Row: Category Filter Tabs */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>Filter Kategori Form ({availableCategoriesInWeek.size} Jenis):</span>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <button
                type="button"
                onClick={() => setSelectedGalleryCategory('ALL')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                  selectedGalleryCategory === 'ALL'
                    ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-600/30'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
                }`}
              >
                <span>Semua Kategori</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                  selectedGalleryCategory === 'ALL' ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {galleryPhotos.length}
                </span>
              </button>

              {Array.from(availableCategoriesInWeek.entries()).map(([cat, count]) => {
                const isActive = selectedGalleryCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedGalleryCategory(cat)}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-600/30'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
                    }`}
                  >
                    <span>{cat}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                      isActive ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
        
        {loadingGallery ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <Loader2 className="w-10 h-10 text-teal-600 animate-spin mb-4" />
            <p className="text-slate-700 font-semibold text-base">Memuat Dokumentasi Galeri...</p>
            <p className="text-slate-400 text-xs mt-1">Menyiapkan dokumentasi visual minggu berjalan</p>
          </div>
        ) : filteredGalleryPhotos.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-700 font-bold text-base">Tidak Ada Foto Ditemukan</p>
            <p className="text-slate-400 text-xs mt-1">Coba ganti filter minggu atau kategori di atas.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.keys(galleryGroupedByCategory).map((categoryName) => {
              const photosInCat = galleryGroupedByCategory[categoryName];
              return (
                <div key={categoryName} className="space-y-4">
                  {/* Category Header */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs">
                        <Layers className="w-4 h-4" />
                      </div>
                      <h3 className="text-base font-bold text-slate-800">{categoryName}</h3>
                      <span className="bg-teal-50 text-teal-700 border border-teal-200 text-xs font-semibold px-2 py-0.5 rounded-full">
                        {photosInCat.length} Foto
                      </span>
                    </div>
                  </div>

                  {/* Photo Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {photosInCat.map((photo: any, idx: number) => {
                      const imgUrl = formatImageUrl(photo.url) || photo.url;
                      return (
                        <Card key={`${photo.url}-${idx}`} className="overflow-hidden p-0 group hover:shadow-lg transition-all duration-300 border border-slate-200 bg-white flex flex-col justify-between">
                          <div>
                            <div className="relative w-full h-52 bg-slate-900/5 overflow-hidden">
                              <img 
                                src={imgUrl} 
                                loading="lazy"
                                decoding="async"
                                referrerPolicy="no-referrer" 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer" 
                                alt="Dokumentasi" 
                                onClick={() => setSelectedImage(photo.url)} 
                              />
                              {/* Zoom overlay button */}
                              <button
                                type="button"
                                onClick={() => setSelectedImage(photo.url)}
                                className="absolute bottom-2 right-2 bg-slate-900/75 hover:bg-slate-900 text-white p-2 rounded-lg backdrop-blur-sm shadow-md transition-colors opacity-90 group-hover:opacity-100 flex items-center gap-1 text-xs"
                              >
                                <ZoomIn className="w-3.5 h-3.5" />
                                <span>Zoom</span>
                              </button>
                              {photo.week && (
                                <div className="absolute top-2 left-2 bg-slate-900/75 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-sm">
                                  {photo.week}
                                </div>
                              )}
                            </div>
                            <div className="p-3.5 space-y-2">
                              <p className="font-semibold text-xs text-slate-800 line-clamp-2 leading-relaxed" title={photo.area}>
                                {photo.area}
                              </p>
                              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                                <p className="flex items-center gap-1 truncate">
                                  <User className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{photo.inspektor}</span>
                                </p>
                                <p className="flex items-center gap-1 text-slate-400">
                                  <CalendarIcon className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{photo.tanggal}</span>
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* QA Presentation Action Buttons */}
                          <div className="p-3 pt-0">
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(imgUrl);
                                  toast.success("Link foto disalin ke clipboard! Siap ditempel di slide presentasi.");
                                }}
                                className="flex-1 text-[11px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 py-1.5 px-2 rounded-md transition-colors flex items-center justify-center gap-1"
                              >
                                <Tag className="w-3 h-3" />
                                Salin Link
                              </button>
                              <a
                                href={photo.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 py-1.5 px-2 rounded-md transition-colors flex items-center justify-center gap-1"
                                title="Buka File di Google Drive"
                              >
                                Drive <ChevronRight className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
      </div>
    );
  }

  if (selectedTicket) {
    const isClosed = selectedTicket.status?.toUpperCase() === 'CLOSED';
    return (
       <div className="w-full max-w-3xl mx-auto space-y-6 animate-in slide-in-from-right-4 pb-20 px-4 md:px-6 pt-6">
          <PageHeader 
            title="Detail Temuan K3"
            description={selectedTicket.ticketId}
            icon={<AlertTriangle className="w-6 h-6 text-amber-500" />}
          >
            <Button onClick={() => setSelectedTicket(null)} variant="secondary" className="h-9 bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-md">
              Kembali
            </Button>
          </PageHeader>

          <Card className={`${isClosed ? 'border-t-4 border-t-teal-500' : 'border-t-4 border-t-rose-500'}`}>
            {selectedTicket.photoUrl && selectedTicket.photoUrl !== '-' && (
              <div className="mb-4">
                <label className="text-xs font-semibold text-rose-600 mb-1 flex items-center gap-1"><Camera className="w-3.5 h-3.5" /> Foto Temuan Awal (Klik untuk perbesar)</label>
                <div className="relative w-full h-72 bg-slate-900/5 rounded-lg border border-slate-200 overflow-hidden group">
                  <img 
                    src={formatImageUrl(selectedTicket.photoUrl) || ''} 
                    referrerPolicy="no-referrer" 
                    alt="Temuan" 
                    onClick={() => setSelectedImage(selectedTicket.photoUrl)} 
                    className="w-full h-full object-contain cursor-pointer hover:opacity-95 transition-opacity" 
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedImage(selectedTicket.photoUrl)}
                    className="absolute bottom-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white px-2.5 py-1.5 rounded-lg backdrop-blur-sm text-xs font-medium flex items-center gap-1"
                  >
                    <ZoomIn className="w-3.5 h-3.5" /> Perbesar
                  </button>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
               <div>
                 <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Dilaporkan Oleh</p>
                 <p className="font-medium text-slate-800">{selectedTicket.requestorName}</p>
               </div>
               <div>
                 <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Area / Lokasi</p>
                 <p className="font-medium text-slate-800">{selectedTicket.location}</p>
               </div>
               <div>
                 <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Deskripsi Temuan</p>
                 <p className="font-medium text-rose-600 leading-relaxed">{selectedTicket.description}</p>
               </div>
               {selectedTicket.risk && (
                 <div>
                   <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Risiko Bahaya</p>
                   <p className="font-medium text-amber-700">{selectedTicket.risk}</p>
                 </div>
               )}
               <div>
                 <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Saran Pengendalian / Rekomendasi</p>
                 <p className="font-medium text-blue-600">{(selectedTicket.initialControl || selectedTicket.actionTaken || '-')}</p>
               </div>
               {selectedTicket.documentLink && (
                 <div>
                   <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Link Dokumen Referensi</p>
                   <a href={selectedTicket.documentLink} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 underline hover:text-blue-700 flex items-center gap-1">
                     Lihat PDF Laporan Inspeksi <ChevronRight className="w-4 h-4" />
                   </a>
                 </div>
               )}
            </div>

            {isClosed ? (
               <div className="mt-6 pt-6 border-t border-slate-100">
                  {selectedTicket.closingPhoto && selectedTicket.closingPhoto !== '-' && (
                    <div className="mb-4">
                      <label className="text-xs font-semibold text-teal-600 mb-1 flex items-center gap-1"><Camera className="w-3.5 h-3.5" /> Bukti Telah Diperbaiki (Klik untuk perbesar)</label>
                      <div className="relative w-full h-72 bg-teal-900/5 rounded-lg border border-teal-200 overflow-hidden group">
                        <img 
                          src={formatImageUrl(selectedTicket.closingPhoto) || ''} 
                          referrerPolicy="no-referrer" 
                          alt="Bukti Perbaikan" 
                          onClick={() => setSelectedImage(selectedTicket.closingPhoto)} 
                          className="w-full h-full object-contain cursor-pointer hover:opacity-95 transition-opacity" 
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedImage(selectedTicket.closingPhoto)}
                          className="absolute bottom-2 right-2 bg-teal-900/80 hover:bg-teal-900 text-white px-2.5 py-1.5 rounded-lg backdrop-blur-sm text-xs font-medium flex items-center gap-1"
                        >
                          <ZoomIn className="w-3.5 h-3.5" /> Perbesar
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 space-y-2">
                     <p className="text-teal-800 font-medium flex items-center gap-2">
                       <CheckCircle2 className="w-5 h-5 text-teal-600" />
                       Diselesaikan Oleh: {selectedTicket.pic || '-'}
                     </p>
                     {selectedTicket.actionTaken && (
                       <p className="text-teal-900 text-sm">
                         <span className="font-semibold">Tindakan:</span> {selectedTicket.actionTaken}
                       </p>
                     )}
                     <p className="text-teal-600 text-xs">Selesai pada: {(selectedTicket.completionDate ? new Date(selectedTicket.completionDate).toLocaleString('id-ID') : '-')}</p>
                  </div>
               </div>
            ) : (
               <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                  <h4 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-teal-600" /> Formulir Penutupan Tiket Temuan
                  </h4>
                  
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Tindakan Perbaikan yang Dilakukan *</label>
                    <Textarea 
                      placeholder="Jelaskan tindakan perbaikan yang telah selesai..." 
                      value={closingNotes} 
                      onChange={(e) => setClosingNotes(e.target.value)} 
                      rows={3} 
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Foto Bukti Perbaikan *</label>
                    <Input type="file" accept="image/*" onChange={handlePhotoUpload} />
                    {closingPhoto && (
                       <div className="mt-2 text-xs text-teal-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Foto bukti siap diunggah
                       </div>
                    )}
                  </div>

                  <Button onClick={submitClose} disabled={isClosing} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold flex items-center justify-center gap-2">
                    {isClosing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {isClosing ? 'Memproses Penutupan...' : 'Tutup Tiket (Selesai)'}
                  </Button>
               </div>
            )}
          </Card>
          
          <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
          <WhatsAppModal 
            isOpen={Boolean(waMessageToModal)} 
            messageText={waMessageToModal} 
            onClose={() => setWaMessageToModal('')} 
            title="Bagikan Penutupan Temuan"
          />
       </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in pb-20 max-w-7xl mx-auto px-4 sm:px-6 pt-6">
      <PageHeader 
        title="Rekapan Temuan Inspeksi"
        description="Monitoring dan tindak lanjut temuan unsafe action / unsafe condition"
        icon={<AlertTriangle className="w-6 h-6 text-amber-500" />}
      >
        <div className="flex items-center gap-3">
          <Select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="w-40 bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-md"
          >
             <option value="OPEN" className="text-slate-800">Tiket Terbuka</option>
             <option value="CLOSED" className="text-slate-800">Tiket Selesai</option>
             <option value="ALL" className="text-slate-800">Semua Tiket</option>
          </Select>

          <Button onClick={loadGallery} variant="secondary" className="h-9 bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-md flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4" />
            Galeri
          </Button>
        </div>
      </PageHeader>

      <DevModeAccordion 
        devOptions={devOptions} 
        setDevOptions={setDevOptions} 
        inspectorNik={inspectorNik} 
      />

      {/* Ticket List Grouped by Week */}
      <div className="space-y-8">
        {loading ? (
           <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
             <Loader2 className="w-10 h-10 text-teal-600 animate-spin mb-4" />
             <p className="text-slate-700 font-semibold">Memuat Rekapan Temuan...</p>
           </div>
        ) : tickets.length === 0 ? (
           <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
             <ShieldCheck className="w-12 h-12 text-teal-500 mx-auto mb-3" />
             <p className="text-slate-700 font-bold text-base">Tidak Ada Tiket Temuan</p>
             <p className="text-slate-400 text-xs mt-1">Semua temuan pada status ini nihil atau telah selesai.</p>
           </div>
        ) : (
           sortedKeys.map((key) => {
              const group = groupedTickets[key];
              return (
                <div key={key} className="space-y-4">
                  <div className="flex items-center gap-2 mb-2 px-1">
                     <CalendarIcon className="w-4 h-4 text-amber-500" />
                     <h3 className="font-bold text-slate-800 text-base">{group.label}</h3>
                     <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                       {group.tickets.length} Tiket
                     </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                     {group.tickets.map((t: any, idx: number) => {
                        const isOp = t.status?.toUpperCase() === 'OPEN';
                        let fotoUrl = t.photoUrl;
                        if (!isOp && t.closingPhoto && t.closingPhoto !== '-') fotoUrl = t.closingPhoto;
                        const formattedFoto = formatImageUrl(fotoUrl);
                        
                        return (
                          <Card 
                            key={`${t.ticketId}-${idx}`} 
                            className={`overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 p-0 flex flex-col justify-between bg-white border ${
                              isOp ? 'border-l-4 border-l-rose-500 border-slate-200' : 'border-l-4 border-l-teal-500 border-slate-200'
                            }`} 
                            onClick={() => setSelectedTicket(t)}
                          >
                            <div>
                              {/* Photo Thumbnail */}
                              {formattedFoto && (
                                <div className="relative w-full h-48 bg-slate-900/5 overflow-hidden group">
                                   <img 
                                     src={formattedFoto} 
                                     referrerPolicy="no-referrer" 
                                     alt="Temuan" 
                                     className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                   />
                                   {/* Direct Zoom Button */}
                                   <button
                                     type="button"
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       setSelectedImage(fotoUrl);
                                     }}
                                     className="absolute top-2 right-2 bg-slate-900/75 hover:bg-slate-900 text-white p-1.5 rounded-md backdrop-blur-sm shadow transition-opacity opacity-80 hover:opacity-100 flex items-center gap-1 text-[11px]"
                                     title="Perbesar Foto"
                                   >
                                     <ZoomIn className="w-3.5 h-3.5" />
                                   </button>
                                </div>
                              )}

                              <div className="p-4 space-y-2">
                                <div className="flex justify-between items-start gap-2">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                    (t.risk || '').toLowerCase().includes('tinggi') || (t.priority || '').toUpperCase() === 'HIGH'
                                      ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                                  }`}>
                                    {t.risk || t.priority || 'Medium'}
                                  </span>
                                  <span className="text-[11px] font-mono font-bold text-slate-500">{t.ticketId}</span>
                                </div>

                                <div>
                                  <h4 className="font-bold text-slate-900 text-sm leading-tight line-clamp-1 mb-1" title={t.location}>
                                    {t.location}
                                  </h4>
                                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                                    {t.description}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="p-4 pt-0">
                              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                <span className={`font-bold ${isOp ? 'text-rose-600' : 'text-teal-600'} flex items-center gap-1`}>
                                   {isOp ? <><AlertTriangle className="w-3.5 h-3.5" /> Perlu Tindak Lanjut</> : <><CheckCircle2 className="w-3.5 h-3.5" /> Telah Selesai</>}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {t.date ? new Date(t.date).toLocaleDateString('id-ID') : '-'}
                                </span>
                              </div>
                            </div>
                          </Card>
                        );
                     })}
                  </div>
                </div>
              );
           })
        )}
      </div>

      <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
      <WhatsAppModal 
        isOpen={Boolean(waMessageToModal)} 
        messageText={waMessageToModal} 
        onClose={() => setWaMessageToModal('')} 
        title="Bagikan Penutupan Temuan"
      />
    </div>
  );
}
