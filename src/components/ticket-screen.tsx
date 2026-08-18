import { toast } from 'sonner';
import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Textarea, Select } from './ui';
import { getTickets, closeTicket, getGalleryPhotos } from '../sheets-api';
import { Loader2, AlertTriangle, CheckCircle2, ShieldCheck, Image as ImageIcon, Camera, User, Calendar as CalendarIcon, Tag } from 'lucide-react';
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
  
  const [showGallery, setShowGallery] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<any[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(false);

  const { devOptions, setDevOptions, parsedDevOptions } = useDevOptions(inspectorNik);

  // For Admin role
  const adminNIKs = ["02D25000055", "02D24000043", "preplabadmin"];
  // We don't have NIK here easily, so let's just show gallery button always or based on some check.
  // Actually, we can just show it.

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
      // Mock compress
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

  const loadGallery = async () => {
    setShowGallery(true);
    setLoadingGallery(true);
    try {
       const photos = await getGalleryPhotos();
       setGalleryPhotos(photos || []);
    } catch(e) {
       console.error("Gagal load galeri", e);
    }
    setLoadingGallery(false);
  };

  // Group tickets by Week
  const groupedTickets = tickets.reduce((acc: any, t: any) => {
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

  const sortedKeys = Object.keys(groupedTickets).sort((a,b) => b.localeCompare(a));

  if (showGallery) {
    return (
      <div className="space-y-6 animate-in fade-in pb-20 md:max-w-3xl md:mx-auto">
        <PageHeader 
          title="Galeri Inspeksi"
          description="Foto proses inspeksi mingguan"
          icon={<ImageIcon />}
        >
          <Button onClick={() => setShowGallery(false)} variant="secondary" className="h-9 bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-md">
            Kembali
          </Button>
        </PageHeader>
        
        {loadingGallery ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-teal-500 animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Memuat Galeri...</p>
          </div>
        ) : (
          <div className="space-y-6">
             {galleryPhotos.length === 0 && (
               <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200">
                 <p className="text-slate-500">Belum ada foto proses inspeksi.</p>
               </div>
             )}
             {galleryPhotos.map((photo, idx) => (
               <Card key={idx} className="overflow-hidden">
                  <button type="button" onClick={() => setSelectedImage(photo.url)} className="w-full text-left outline-none">
                    <img src={formatImageUrl(photo.url) || photo.url} referrerPolicy="no-referrer" className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity" alt="Proses Inspeksi" />
                  </button>
                  <div className="p-3 bg-white">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100 flex items-center gap-1">
                          <Tag className="w-3 h-3" /> Form {photo.sumber}
                       </span>
                    </div>
                    <p className="font-semibold text-sm text-slate-800 line-clamp-1">{photo.area}</p>
                    <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                       <p className="flex items-center gap-1"><User className="w-3 h-3" /> {photo.inspektor}</p>
                       <p className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> {photo.tanggal}</p>
                    </div>
                  </div>
               </Card>
             ))}
          </div>
        )}
      </div>
    );
  }

  if (selectedTicket) {
    const isClosed = selectedTicket.status?.toUpperCase() === 'CLOSED';
    return (
       <div className="w-full max-w-3xl mx-auto space-y-6 animate-in slide-in-from-right-4 pb-20 px-4 md:px-6 pt-6">
          <PageHeader 
            title="Detail Tiket"
            description={selectedTicket.ticketId}
            icon={<AlertTriangle />}
          >
            <Button onClick={() => setSelectedTicket(null)} variant="secondary" className="h-9 bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-md">
              Kembali
            </Button>
          </PageHeader>

          <Card className={`${isClosed ? 'border-t-4 border-t-teal-500' : 'border-t-4 border-t-rose-500'}`}>
            {selectedTicket.photoUrl && selectedTicket.photoUrl !== '-' && (
              <div className="mb-4">
                <label className="text-xs font-semibold text-rose-600 mb-1 flex items-center gap-1"><Camera className="w-3.5 h-3.5" /> Foto Temuan Awal</label>
                <img src={formatImageUrl(selectedTicket.photoUrl) || ''} referrerPolicy="no-referrer" alt="Temuan" className="w-full h-auto max-h-[400px] object-contain bg-slate-50 rounded-lg border border-slate-200" />
              </div>
            )}
            
            <div className="space-y-4">
               <div>
                 <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Dilaporkan Oleh</p>
                 <p className="font-medium text-slate-800">{selectedTicket.requestorName}</p>
               </div>
               <div>
                 <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Deskripsi Temuan</p>
                 <p className="font-medium text-rose-600">{selectedTicket.description}</p>
               </div>
               <div>
                 <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Saran Pengendalian / Rekomendasi</p>
                 <p className="font-medium text-blue-600">{(selectedTicket.actionTaken || selectedTicket.initialControl)}</p>
               </div>
            </div>

            {isClosed ? (
               <div className="mt-6 pt-6 border-t border-slate-100">
                  {selectedTicket.closingPhoto && selectedTicket.closingPhoto !== '-' && (
                    <div className="mb-4">
                      <label className="text-xs font-semibold text-teal-600 mb-1 flex items-center gap-1"><Camera className="w-3.5 h-3.5" /> Bukti Telah Diperbaiki</label>
                      <img src={formatImageUrl(selectedTicket.closingPhoto) || ''} referrerPolicy="no-referrer" alt="Bukti Perbaikan" className="w-full h-auto max-h-[400px] object-contain bg-slate-50 rounded-lg border border-teal-200" />
                    </div>
                  )}
                  <div className="bg-teal-50 p-4 rounded-xl border border-teal-100">
                     <p className="text-teal-800 font-medium flex items-center gap-2 mb-1">
                       <CheckCircle2 className="w-5 h-5 text-teal-600" />
                       Diselesaikan Oleh: {selectedTicket.pic}
                     </p>
                     <p className="text-teal-600 text-sm">Selesai pada: {(selectedTicket.completionDate ? new Date(selectedTicket.completionDate).toLocaleDateString('id-ID') : '-')}</p>
                  </div>
               </div>
            ) : (
               <div className="mt-6 pt-6 border-t border-slate-100">
                 <h4 className="font-semibold text-teal-700 mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Form Penyelesaian</h4>
                 <div className="space-y-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
                   <Textarea 
                     label="Deskripsi Perbaikan" 
                     placeholder="Jelaskan tindakan perbaikan yang telah dilakukan..."
                     value={closingNotes}
                     onChange={(e) => setClosingNotes(e.target.value)}
                     required
                   />
                   
                   <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Bukti Perbaikan (Foto)</label>
                     {closingPhoto ? (
                       <div className="relative">
                         <img src={closingPhoto.url} className="w-full h-32 object-cover rounded-lg border border-teal-200" />
                         <Button onClick={() => setClosingPhoto(null)} variant="secondary" className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm shadow-sm rounded-full h-8 px-3">Ganti</Button>
                       </div>
                     ) : (
                       <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-lg bg-white cursor-pointer hover:bg-slate-50 hover:border-teal-400 transition-colors">
                         <Camera className="w-6 h-6 text-slate-400 mb-2" />
                         <span className="text-sm font-medium text-slate-600">Pilih Foto</span>
                         <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                       </label>
                     )}
                   </div>
                   
                   <Button onClick={submitClose} disabled={isClosing} className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold">
                     {isClosing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ShieldCheck className="w-5 h-5 mr-2" />}
                     {isClosing ? 'Memproses...' : 'Tutup Temuan Ini'}
                   </Button>
                 </div>
               </div>
            )}
          </Card>
       </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 px-4 md:px-6 pt-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shadow-inner">
             <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-slate-800 leading-tight">Temuan K3</h2>
            <p className="text-sm text-slate-500 mt-1">Kelola tiket temuan inspeksi</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Select 
             label="" 
             value={filter} 
             onChange={e => setFilter(e.target.value)}
            options={[
              { value: 'OPEN', label: 'Tiket Terbuka' },
              { value: 'CLOSED', label: 'Tiket Selesai' },
              { value: 'ALL', label: 'Semua Tiket' }
            ]}
            className="w-full md:w-48 bg-slate-50"
          />
          <Button onClick={loadGallery} variant="secondary" className="h-10 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 shadow-sm shrink-0">
            <ImageIcon className="w-4 h-4 mr-2" /> Galeri
          </Button>
        </div>
      </div>
      
      <DevModeAccordion inspectorNik={inspectorNik} devOptions={devOptions} setDevOptions={setDevOptions} />

      <div className="space-y-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Memuat tiket...</p>
          </div>
        ) : tickets.length === 0 ? (
          <Card className="text-center py-12 border-dashed border-2 border-slate-200 bg-slate-50">
             <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm text-slate-400 mb-4">
                <CheckCircle2 className="w-8 h-8 text-teal-500" />
             </div>
             <h3 className="text-slate-700 font-medium font-display text-lg">Tidak ada tiket</h3>
             <p className="text-slate-500 text-sm mt-1">Tidak ada temuan pada kategori ini.</p>
          </Card>
        ) : (
          sortedKeys.map((key) => {
             const group = groupedTickets[key];
             return (
               <div key={key} className="space-y-3">
                 <div className="flex items-center gap-2 mb-2 px-1">
                    <CalendarIcon className="w-4 h-4 text-amber-500" />
                    <h3 className="font-semibold text-slate-700 text-sm">{group.label}</h3>
                    <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{group.tickets.length} Tiket</span>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {group.tickets.map((t: any, idx: number) => {
                       const isOp = t.status?.toUpperCase() === 'OPEN';
                       let fotoUrl = t.photoUrl;
                       if (!isOp && t.closingPhoto && t.closingPhoto !== '-') fotoUrl = t.closingPhoto;
                       
                       return (
                         <Card key={`${t.ticketId}-${idx}`} className={`overflow-hidden cursor-pointer hover:shadow-md transition-shadow p-0 ${isOp ? 'border-l-4 border-l-rose-500' : 'border-l-4 border-l-teal-500'}`} onClick={() => setSelectedTicket(t)}>
                           {fotoUrl && fotoUrl !== '-' && (
                             <div className="h-32 w-full overflow-hidden bg-slate-100 shrink-0 relative">
                                <img src={formatImageUrl(fotoUrl) || ''} referrerPolicy="no-referrer" alt="Temuan" className="w-full h-full object-cover" />
                                {isOp && <div className="absolute inset-0 bg-rose-500/10 pointer-events-none" />}
                             </div>
                           )}
                           <div className="p-4">
                             <div className="flex justify-between items-start mb-2">
                               <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${(t.risk || t.priority) === 'TINGGI' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'}`}>
                                 {(t.risk || t.priority)}
                               </span>
                               <span className="text-xs font-mono font-medium text-slate-500">{t.ticketId}</span>
                             </div>
                             <h4 className="font-semibold text-slate-800 leading-tight mb-1">{t.location}</h4>
                             <p className="text-sm text-slate-500 line-clamp-2">{t.description}</p>
                             
                             <div className="mt-4 pt-4 border-t border-slate-100">
                               <span className={`text-xs font-semibold ${isOp ? 'text-rose-600' : 'text-teal-600'} flex items-center gap-1`}>
                                  {isOp ? <><AlertTriangle className="w-3.5 h-3.5" /> Perlu Tindak Lanjut</> : <><CheckCircle2 className="w-3.5 h-3.5" /> Telah Selesai</>}
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
    </div>
  );
}
