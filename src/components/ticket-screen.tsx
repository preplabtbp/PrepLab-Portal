import { toast } from 'sonner';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import JSZip from 'jszip';
import { Card, Button, Input, Textarea, Select } from './ui';
import { getTickets, closeTicket, getGalleryPhotos } from '../sheets-api';
import { 
  Loader2, AlertTriangle, CheckCircle2, ShieldCheck, Image as ImageIcon, 
  Camera, User, Calendar as CalendarIcon, Tag, ZoomIn, Filter, Layers, 
  ChevronRight, ArrowLeft, RefreshCw, ChevronDown, Download, FileText, Archive 
} from 'lucide-react';
import { ImageModal } from './image-modal';
import { WhatsAppModal } from './whatsapp-modal';
import { DevModeAccordion, useDevOptions } from './dev-mode-accordion';
import { PageHeader } from './PageHeader';
import { StructuredFindingList, CompactFindingPreview, parseFindingDescription } from './StructuredFindingList';
import { renderTicketCardAsJpgBlob } from '../utils/exportTicketRecapJpg';

const formatImageUrl = (url: string) => {
  if (!url || url === '-') return null;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]{25,})/);
  if (match) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
  }
  match = url.match(/[?&]id=([a-zA-Z0-9_-]{25,})/);
  if (match) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
  }
  return url;
};

export function extractDriveFileId(url: string): string | null {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return null;
  const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]{25,})/);
  if (match1) return match1[1];
  const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]{25,})/);
  if (match2) return match2[1];
  return null;
}

export function getPhotoFetchUrl(photoUrl: string): string {
  if (!photoUrl) return '';
  if (photoUrl.startsWith('data:') || photoUrl.startsWith('blob:')) {
    return photoUrl;
  }
  const fileId = extractDriveFileId(photoUrl);
  if (fileId) {
    return `/api/drive/view/${fileId}`;
  }
  return `/api/gallery/image-proxy?url=${encodeURIComponent(photoUrl)}`;
}

export async function fetchPhotoAsBlob(photoUrl: string): Promise<Blob> {
  if (!photoUrl || photoUrl === '-') throw new Error("URL foto tidak valid");

  // 1. Data URL (Base64) langsung dikonversi ke Blob tanpa network request HTTP (mencegah error 414 URL too long)
  if (photoUrl.startsWith('data:')) {
    const arr = photoUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  // 2. Blob URL
  if (photoUrl.startsWith('blob:')) {
    const res = await fetch(photoUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.blob();
  }

  // 3. Google Drive URL via backend streaming proxy /api/drive/view/:fileId
  const fileId = extractDriveFileId(photoUrl);
  if (fileId) {
    try {
      const driveRes = await fetch(`/api/drive/view/${fileId}`);
      if (driveRes.ok) {
        return await driveRes.blob();
      }
    } catch (e) {
      console.warn("Gagal stream drive langsung:", e);
    }
  }

  // 4. Fallback ke /api/gallery/image-proxy
  const fetchUrl = `/api/gallery/image-proxy?url=${encodeURIComponent(photoUrl)}`;
  const res = await fetch(fetchUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.blob();
}

export function getInspectionPhotoFileName(photo: any, duplicateCount?: number): string {
  const clean = (s: string) => (s || '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Extract Week XX (e.g. "Minggu ke-37 (2026)" -> "Week 37", "W35" -> "Week 35")
  let weekStr = 'Week';
  const matchWk = (photo.week || '').match(/(?:Minggu ke-|W)(\d+)/i);
  if (matchWk) {
    weekStr = `Week ${matchWk[1]}`;
  } else if (photo.week) {
    weekStr = clean(photo.week);
  }

  // 2. Extract Nama Form
  const formName = clean(photo.sumber || 'Inspeksi');

  // 3. Extract Area (strip duplicate form name prefix if present)
  let rawArea = photo.area || 'Area';
  const prefixRegex = new RegExp(`^${formName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\-:_]+`, 'i');
  if (prefixRegex.test(rawArea)) {
    rawArea = rawArea.replace(prefixRegex, '');
  }
  // Bersihkan ekstensi gambar dari rawArea jika ada (misal .jpeg atau .jpg)
  rawArea = rawArea.replace(/\.(jpe?g|png|webp|gif)$/i, '');
  const areaName = clean(rawArea) || 'Area';

  const suffix = duplicateCount && duplicateCount > 1 ? ` (${duplicateCount})` : '';

  // Format: Week XX_Nama Form_Area.jpg (Pastikan ekstensi selalu .jpg bukan .jpeg)
  let resultName = `${weekStr}_${formName}_${areaName}${suffix}.jpg`
    .replace(/\.jpeg$/i, '.jpg')
    .replace(/_{2,}/g, '_')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (resultName.toLowerCase().endsWith('.jpeg')) {
    resultName = resultName.slice(0, -5) + '.jpg';
  }

  return resultName;
}

export function getTicketPhotoFileName(ticket: any, photoType: 'OPEN' | 'CLOSED', sequenceNumber: number = 1): string {
  const isClosed = photoType === 'CLOSED' || ticket?.status?.toUpperCase() === 'CLOSED';
  return `${isClosed ? 'Closed' : 'Open'}_${sequenceNumber}.jpg`;
}

export function extractTicketWeek(t: any): { label: string; key: string } {
  const ticketId = t.ticketId || '';
  const match = ticketId.match(/W(\d+)[\-_Y\s](\d{2,4})/i) || ticketId.match(/W(\d+)Y(\d+)/i);
  if (match) {
    const w = match[1].padStart(2, '0');
    let y = match[2];
    if (y.length === 2) y = "20" + y;
    return {
      label: `Minggu ke-${w} (${y})`,
      key: `${y}${w}`
    };
  }
  const matchW = ticketId.match(/W(\d+)/i);
  if (matchW) {
    const w = matchW[1].padStart(2, '0');
    return {
      label: `Minggu ke-${w} (2026)`,
      key: `2026${w}`
    };
  }
  if (t.date) {
    try {
      const d = new Date(t.date);
      if (!isNaN(d.getTime())) {
        const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const dayNr = target.getUTCDay() || 7;
        target.setUTCDate(target.getUTCDate() + 4 - dayNr);
        const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        const y = target.getUTCFullYear();
        const wStr = String(weekNo).padStart(2, '0');
        return {
          label: `Minggu ke-${wStr} (${y})`,
          key: `${y}${wStr}`
        };
      }
    } catch {}
  }
  return { label: "Minggu Lainnya", key: "000000" };
}

export function TicketScreen({ inspectorName, inspectorNik }: { inspectorName: string, inspectorNik: string }) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('OPEN');
  const [selectedTicketWeek, setSelectedTicketWeek] = useState<string>('ALL');
  const [downloadTargetWeek, setDownloadTargetWeek] = useState<string>('');
  
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [closingNotes, setClosingNotes] = useState('');
  const [closingPhoto, setClosingPhoto] = useState<{ url: string, file: File, base64: string } | null>(null);
  const [waMessageToModal, setWaMessageToModal] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  
  // Auto Download Rekapan Temuan states
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [isZippingTickets, setIsZippingTickets] = useState(false);
  const downloadDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadDropdownRef.current && !downloadDropdownRef.current.contains(event.target as Node)) {
        setShowDownloadMenu(false);
      }
    };
    if (showDownloadMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDownloadMenu]);

  // Gallery states
  const [showGallery, setShowGallery] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<any[]>([]);
  const [availableGalleryWeeks, setAvailableGalleryWeeks] = useState<string[]>([]);
  const [totalGalleryPhotosCount, setTotalGalleryPhotosCount] = useState<number>(0);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [selectedGalleryWeek, setSelectedGalleryWeek] = useState<string>('Minggu ke-35 (2026)');
  const [selectedGalleryCategory, setSelectedGalleryCategory] = useState<string>('ALL');
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState('');

  const fallbackWeeks = useMemo(() => {
    const list: string[] = [];
    for (let w = 35; w >= 1; w--) {
      list.push(`Minggu ke-${String(w).padStart(2, '0')} (2026)`);
    }
    return list;
  }, []);

  const displayWeeks = availableGalleryWeeks.length > 0 ? availableGalleryWeeks : fallbackWeeks;

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

  useEffect(() => {
    // Prefetch available gallery weeks so week selector stays synced with calendar weeks
    getGalleryPhotos().then(res => {
      const weeksList = res?.availableWeeks || [];
      if (weeksList.length > 0) setAvailableGalleryWeeks(weeksList);
      if (res?.totalPhotos) setTotalGalleryPhotosCount(res.totalPhotos);
    }).catch(() => {});
  }, []);

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
      const { label, key } = extractTicketWeek(t);
      if (!acc[key]) acc[key] = { label, tickets: [] };
      acc[key].tickets.push(t);
      return acc;
    }, {});
  }, [tickets]);

  const sortedKeys = Object.keys(groupedTickets).sort((a,b) => b.localeCompare(a));

  const availableTicketWeeks = useMemo(() => {
    const weekMap = new Map<string, string>(); // label -> key

    displayWeeks.forEach(w => {
      const match = w.match(/Minggu ke-(\d+)\s*\((\d+)\)/i);
      if (match) {
        const key = `${match[2]}${match[1].padStart(2, '0')}`;
        weekMap.set(w, key);
      } else {
        weekMap.set(w, w);
      }
    });

    Object.keys(groupedTickets).forEach(key => {
      const label = groupedTickets[key].label;
      if (!weekMap.has(label) && label !== "Minggu Lainnya") {
        weekMap.set(label, key);
      }
    });

    return Array.from(weekMap.entries())
      .map(([label, key]) => ({ label, key }))
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [displayWeeks, groupedTickets]);

  const displayKeys = useMemo(() => {
    if (selectedTicketWeek === 'ALL') {
      return sortedKeys;
    }
    return sortedKeys.filter(key => groupedTickets[key]?.label === selectedTicketWeek);
  }, [sortedKeys, groupedTickets, selectedTicketWeek]);

  useEffect(() => {
    if (availableTicketWeeks.length > 0 && !downloadTargetWeek) {
      setDownloadTargetWeek(availableTicketWeeks[0].label);
    }
  }, [availableTicketWeeks, downloadTargetWeek]);

  useEffect(() => {
    if (selectedTicketWeek && selectedTicketWeek !== 'ALL') {
      setDownloadTargetWeek(selectedTicketWeek);
    }
  }, [selectedTicketWeek]);

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

  const handleDownloadAllZip = async () => {
    if (!filteredGalleryPhotos.length) {
      toast.error("Tidak ada foto untuk diunduh.");
      return;
    }
    setIsZipping(true);
    setZipProgress(`0 / ${filteredGalleryPhotos.length}`);
    try {
      const zip = new JSZip();
      const rawWeek = (selectedGalleryWeek || 'Semua_Minggu').replace(/[^a-zA-Z0-9_-]/g, '_');
      const zipBaseName = `Dokumentasi_Inspeksi_${rawWeek}`;
      const folder = zip.folder(zipBaseName) || zip;

      const usedFileNames = new Map<string, number>();
      let successCount = 0;
      for (let i = 0; i < filteredGalleryPhotos.length; i++) {
        const photo = filteredGalleryPhotos[i];
        setZipProgress(`${i + 1} / ${filteredGalleryPhotos.length}`);
        try {
          const blob = await fetchPhotoAsBlob(photo.url);

          const baseName = getInspectionPhotoFileName(photo);
          const currentCount = (usedFileNames.get(baseName) || 0) + 1;
          usedFileNames.set(baseName, currentCount);

          const fileName = currentCount > 1 
            ? getInspectionPhotoFileName(photo, currentCount) 
            : baseName;

          folder.file(fileName, blob);
          successCount++;
        } catch (err) {
          console.warn(`Gagal fetch foto ${i + 1}:`, err);
        }
      }

      if (successCount === 0) {
        toast.error("Gagal mengunduh foto dokumentasi. Pastikan koneksi server atau Google Drive aktif.");
        setIsZipping(false);
        setZipProgress('');
        return;
      }

      setZipProgress("Mengompresi file ZIP...");
      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `${zipBaseName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast.success(`Berhasil mengunduh ${successCount} foto dalam arsip ZIP!`);
    } catch (err) {
      console.error("Gagal membuat zip:", err);
      toast.error("Terjadi kesalahan saat memproses unduhan ZIP.");
    } finally {
      setIsZipping(false);
      setZipProgress('');
    }
  };

  const handleDownloadSinglePhoto = async (photo: any) => {
    const fileName = getInspectionPhotoFileName(photo);
    try {
      toast.info(`Mengunduh: ${fileName}...`);
      const blob = await fetchPhotoAsBlob(photo.url);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success(`Foto ${fileName} berhasil diunduh!`);
    } catch (err) {
      console.error("Gagal unduh foto satuan:", err);
    }
  };

  const handleDownloadSingleTicketPhoto = async (ticket: any, photoType: 'OPEN' | 'CLOSED' = 'OPEN', asCardJpg: boolean = true) => {
    try {
      let blob: Blob;
      if (asCardJpg) {
        toast.info(`Membuat gambar kartu temuan (.jpg)...`);
        blob = await renderTicketCardAsJpgBlob(ticket);
      } else {
        let url = photoType === 'CLOSED' ? (ticket.closingPhoto || ticket.photoUrl) : ticket.photoUrl;
        if (!url || url === '-') {
          toast.error("Foto tidak tersedia untuk diunduh.");
          return;
        }
        toast.info(`Mengunduh foto...`);
        blob = await fetchPhotoAsBlob(url);
      }

      const fileName = getTicketPhotoFileName(ticket, photoType, 1);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success(`Gambar kartu temuan ${fileName} berhasil diunduh!`);
    } catch (err) {
      console.error("Gagal unduh gambar tiket:", err);
      toast.error("Gagal mengunduh gambar kartu temuan.");
    }
  };

  const handleDownloadTicketsZip = async (
    targetType: 'OPEN' | 'CLOSED' | 'ALL' | 'CURRENT_WEEK',
    customTickets?: any[],
    customWeekLabel?: string,
    rawPhotosOnly: boolean = false,
    overrideWeek?: string
  ) => {
    setIsZippingTickets(true);
    setZipProgress('Menyiapkan tiket...');
    try {
      let targetTickets: any[] = [];
      if (customTickets && customTickets.length > 0) {
        targetTickets = customTickets;
      } else if (targetType === 'OPEN') {
        targetTickets = filter === 'OPEN' ? tickets : await getTickets('OPEN');
      } else if (targetType === 'CLOSED') {
        targetTickets = filter === 'CLOSED' ? tickets : await getTickets('CLOSED');
      } else {
        targetTickets = filter === 'ALL' ? tickets : await getTickets('ALL');
      }

      const activeTargetWeek = overrideWeek || selectedTicketWeek;

      // Filter by selected week if not ALL and not already customTickets
      if (!customTickets && activeTargetWeek && activeTargetWeek !== 'ALL') {
        targetTickets = targetTickets.filter((t: any) => extractTicketWeek(t).label === activeTargetWeek);
      }

      if (targetTickets.length === 0) {
        toast.error(`Tidak ada tiket temuan yang tersedia untuk diunduh (${targetType}${activeTargetWeek && activeTargetWeek !== 'ALL' ? ` - ${activeTargetWeek}` : ''}).`);
        setIsZippingTickets(false);
        setZipProgress('');
        return;
      }

      const zip = new JSZip();
      let zipBaseName = `Rekapan_Kartu_Temuan_${targetType}`;
      if (customWeekLabel) {
        zipBaseName = `Rekapan_Kartu_Temuan_${customWeekLabel.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      } else if (activeTargetWeek && activeTargetWeek !== 'ALL') {
        zipBaseName = `Rekapan_Kartu_Temuan_${targetType}_${activeTargetWeek.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      }
      const folder = zip.folder(zipBaseName) || zip;

      let openCounter = 0;
      let closedCounter = 0;
      let successCount = 0;

      for (let i = 0; i < targetTickets.length; i++) {
        const ticket = targetTickets[i];
        setZipProgress(`${i + 1} / ${targetTickets.length}`);
        try {
          const isClosed = ticket.status?.toUpperCase() === 'CLOSED';
          const photoType = isClosed ? 'CLOSED' : 'OPEN';

          let blob: Blob;
          if (rawPhotosOnly) {
            const rawUrl = isClosed ? (ticket.closingPhoto || ticket.photoUrl) : ticket.photoUrl;
            if (!rawUrl || rawUrl === '-') continue;
            blob = await fetchPhotoAsBlob(rawUrl);
          } else {
            // Render exact card matching user's screenshot as JPG
            blob = await renderTicketCardAsJpgBlob(ticket);
          }

          let fileName = '';
          if (isClosed) {
            closedCounter++;
            fileName = `Closed_${closedCounter}.jpg`;
          } else {
            openCounter++;
            fileName = `Open_${openCounter}.jpg`;
          }

          folder.file(fileName, blob);
          successCount++;
        } catch (err) {
          console.warn(`Gagal render kartu tiket ${ticket.ticketId}:`, err);
        }
      }

      if (successCount === 0) {
        toast.error("Gagal membuat gambar kartu temuan.");
        setIsZippingTickets(false);
        setZipProgress('');
        return;
      }

      setZipProgress('Mengompresi ZIP...');
      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `${zipBaseName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast.success(`Berhasil mengunduh ${successCount} kartu temuan (.jpg) dalam file ZIP!`);
    } catch (err) {
      console.error("Gagal membuat zip rekapan temuan:", err);
      toast.error("Terjadi kesalahan saat memproses unduhan ZIP.");
    } finally {
      setIsZippingTickets(false);
      setZipProgress('');
    }
  };

  if (showGallery) {
    return (
      <div className="space-y-6 animate-in fade-in pb-20 max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <PageHeader 
          title="Galeri Dokumentasi Inspeksi"
          description="Koleksi foto dokumentasi proses & temuan inspeksi per minggu"
          icon={<ImageIcon className="w-6 h-6 text-teal-600" />}
        >
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={handleDownloadAllZip}
              disabled={isZipping || filteredGalleryPhotos.length === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer ${
                isZipping ? 'opacity-75 cursor-not-allowed' : ''
              }`}
              title="Unduh semua foto yang tampil sebagai file ZIP dengan nama file rapi"
            >
              {isZipping ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>ZIP ({zipProgress})...</span>
                </>
              ) : (
                <>
                  <Archive className="w-3.5 h-3.5" />
                  <span>Unduh Semua Foto (ZIP)</span>
                </>
              )}
            </button>
            <button
              onClick={() => {
                fetchWeekGallery(selectedGalleryWeek, true);
                toast.success("Galeri berhasil diperbarui");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingGallery ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowGallery(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Tiket</span>
            </button>
          </div>
        </PageHeader>

        {/* QA Weekly Presentation Banner */}
        <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-slate-50 p-5 rounded-2xl border border-teal-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-teal-500/15 text-teal-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider border border-teal-500/30">
                QA Weekly Presentation Mode
              </span>
              <span className="text-slate-600 text-xs font-medium">
                {selectedGalleryWeek === 'ALL' ? 'Semua Minggu' : selectedGalleryWeek}
              </span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">Dokumentasi Visual Hasil Inspeksi</h3>
            <p className="text-xs text-slate-600">
              Gunakan tombol <span className="font-semibold text-teal-700">Unduh Foto</span> atau <span className="font-semibold text-teal-700">Download ZIP</span> untuk merekap foto dengan nama file standar inspeksi.
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md p-3 rounded-xl border border-teal-200/80 shrink-0 flex-wrap sm:flex-nowrap shadow-xs">
            <div className="text-center px-2">
              <p className="text-2xl font-black text-teal-600">{filteredGalleryPhotos.length}</p>
              <p className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Total Foto</p>
            </div>
            <div className="w-[1px] h-8 bg-slate-200" />
            <div className="text-center px-2">
              <p className="text-2xl font-black text-amber-600">{Object.keys(galleryGroupedByCategory).length}</p>
              <p className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Kategori Form</p>
            </div>
            <div className="w-[1px] h-8 bg-slate-200" />
            <button
              type="button"
              onClick={handleDownloadAllZip}
              disabled={isZipping || filteredGalleryPhotos.length === 0}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isZipping ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{zipProgress}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download ZIP ({filteredGalleryPhotos.length})</span>
                </>
              )}
            </button>
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
                  {displayWeeks.map((wk, idx) => (
                    <option key={wk} value={wk}>
                      {idx === 0 ? `⭐ ${wk} (Minggu Berjalan)` : wk}
                    </option>
                  ))}
                  <option value="ALL">Semua Minggu ({totalGalleryPhotosCount || '945'} Foto)</option>
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
                              <div className="flex items-center gap-1.5 text-[10px] font-mono text-teal-800 bg-teal-50/80 border border-teal-200/80 px-2 py-1 rounded-lg truncate" title={getInspectionPhotoFileName(photo)}>
                                <FileText className="w-3 h-3 shrink-0 text-teal-600" />
                                <span className="truncate">{getInspectionPhotoFileName(photo)}</span>
                              </div>
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
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleDownloadSinglePhoto(photo)}
                                className="flex-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 py-1.5 px-2 rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                title="Unduh foto dengan format Week XX_Nama Form_Area"
                              >
                                <Download className="w-3 h-3" />
                                <span>Unduh</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(imgUrl);
                                  toast.success("Link foto disalin ke clipboard!");
                                }}
                                className="text-[11px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 py-1.5 px-2 rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                title="Salin link foto beresolusi tinggi"
                              >
                                <Tag className="w-3 h-3" />
                                <span>Salin Link</span>
                              </button>
                              <a
                                href={photo.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 py-1.5 px-2 rounded-md transition-colors flex items-center justify-center gap-1"
                                title="Buka File di Google Drive"
                              >
                                <span>Drive</span>
                                <ChevronRight className="w-3 h-3" />
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
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => handleDownloadSingleTicketPhoto(selectedTicket, isClosed ? 'CLOSED' : 'OPEN', true)} 
                className="h-9 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                title="Unduh gambar kartu temuan lengkap persis formulir ini (.jpg)"
              >
                <Download className="w-3.5 h-3.5" /> Unduh Kartu (JPG)
              </Button>
              <Button onClick={() => setSelectedTicket(null)} variant="secondary" className="h-9 bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-md">
                Kembali
              </Button>
            </div>
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
                  <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleDownloadSingleTicketPhoto(selectedTicket, 'OPEN', true)}
                      className="bg-slate-900/80 hover:bg-slate-900 text-white px-2.5 py-1.5 rounded-lg backdrop-blur-sm text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                      title="Unduh gambar kartu temuan lengkap persis formulir ini (.jpg)"
                    >
                      <Download className="w-3.5 h-3.5" /> Unduh Kartu (JPG)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedImage(selectedTicket.photoUrl)}
                      className="bg-slate-900/80 hover:bg-slate-900 text-white px-2.5 py-1.5 rounded-lg backdrop-blur-sm text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                    >
                      <ZoomIn className="w-3.5 h-3.5" /> Perbesar
                    </button>
                  </div>
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
                 <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Deskripsi Temuan</p>
                 <StructuredFindingList description={selectedTicket.description} />
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
                        <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDownloadSingleTicketPhoto(selectedTicket, 'CLOSED', true)}
                            className="bg-teal-900/80 hover:bg-teal-900 text-white px-2.5 py-1.5 rounded-lg backdrop-blur-sm text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                            title="Unduh gambar kartu temuan lengkap persis formulir ini (.jpg)"
                          >
                            <Download className="w-3.5 h-3.5" /> Unduh Kartu (JPG)
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedImage(selectedTicket.closingPhoto)}
                            className="bg-teal-900/80 hover:bg-teal-900 text-white px-2.5 py-1.5 rounded-lg backdrop-blur-sm text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                          >
                            <ZoomIn className="w-3.5 h-3.5" /> Perbesar
                          </button>
                        </div>
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
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filter Status Selector */}
          <div className="relative">
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="h-10 pl-9 pr-8 text-xs font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 transition-all outline-none focus:ring-2 focus:ring-teal-500/40 cursor-pointer shadow-xs appearance-none"
            >
              <option value="OPEN" className="py-1">🔴 Tiket Terbuka</option>
              <option value="CLOSED" className="py-1">🟢 Tiket Selesai</option>
              <option value="ALL" className="py-1">📋 Semua Tiket</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-teal-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Filter Week Selector (Sama seperti Galeri Foto) */}
          <div className="relative">
            <select 
              value={selectedTicketWeek} 
              onChange={(e) => setSelectedTicketWeek(e.target.value)}
              className="h-10 pl-9 pr-8 text-xs font-bold rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 transition-all outline-none focus:ring-2 focus:ring-teal-500/40 cursor-pointer shadow-xs appearance-none max-w-[210px] sm:max-w-[250px] truncate"
              title="Pilih Minggu Inspeksi (Filter Temuan)"
            >
              <option value="ALL" className="py-1">🗓️ Semua Minggu</option>
              {availableTicketWeeks.map((wk, idx) => {
                const count = groupedTickets[wk.key]?.tickets?.length || 0;
                return (
                  <option key={wk.label} value={wk.label} className="py-1">
                    {idx === 0 
                      ? `⭐ ${wk.label} (Minggu Berjalan)${count > 0 ? ` (${count})` : ''}` 
                      : `📅 ${wk.label}${count > 0 ? ` (${count})` : ''}`}
                  </option>
                );
              })}
            </select>
            <CalendarIcon className="w-3.5 h-3.5 text-teal-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Tombol Auto Download Rekapan Temuan (ZIP) */}
          <div className="relative" ref={downloadDropdownRef}>
            <button 
              type="button"
              onClick={() => setShowDownloadMenu(prev => !prev)}
              disabled={isZippingTickets}
              className="h-10 px-3.5 sm:px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-950/30 border border-indigo-400/30 transition-all transform hover:scale-[1.02] active:scale-95 cursor-pointer disabled:opacity-50"
              title="Auto Download Rekapan Foto Temuan Inspeksi (ZIP)"
            >
              {isZippingTickets ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span className="font-mono">{zipProgress || 'Memproses...'}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-white" />
                  <span>Auto Download</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                </>
              )}
            </button>

            {showDownloadMenu && (
              <div className="absolute right-0 mt-2 w-84 bg-white rounded-2xl shadow-2xl border border-slate-200 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 pb-2.5 border-b border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Rekapan Kartu Temuan (.JPG)</p>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                      Weekly / Custom
                    </span>
                  </div>

                  {/* Selector Minggu khusus untuk Auto Download */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                      <CalendarIcon className="w-3.5 h-3.5 text-teal-600" />
                      <span>Target Minggu yang Diunduh:</span>
                    </label>
                    <select
                      value={downloadTargetWeek}
                      onChange={(e) => setDownloadTargetWeek(e.target.value)}
                      className="w-full h-8.5 px-2.5 text-xs font-bold rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-300 transition-all outline-none focus:ring-2 focus:ring-teal-500/40 cursor-pointer"
                    >
                      {availableTicketWeeks.map((wk, idx) => (
                        <option key={wk.label} value={wk.label}>
                          {idx === 0 ? `⭐ ${wk.label} (Minggu Berjalan)` : `📅 ${wk.label}`}
                        </option>
                      ))}
                      <option value="ALL">🗓️ Semua Minggu (Seluruh Data)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-1.5 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => { setShowDownloadMenu(false); handleDownloadTicketsZip('OPEN', undefined, undefined, false, downloadTargetWeek); }}
                    className="w-full px-4 py-2.5 text-left text-xs hover:bg-rose-50 text-slate-700 hover:text-rose-700 flex items-center gap-2.5 transition-colors cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 group-hover:text-rose-700">Unduh Kartu OPEN (JPG ZIP)</p>
                      <p className="text-[10px] text-slate-400">
                        {downloadTargetWeek !== 'ALL' ? `Khusus kartu OPEN ${downloadTargetWeek}` : 'Seluruh kartu OPEN dari semua minggu'}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setShowDownloadMenu(false); handleDownloadTicketsZip('CLOSED', undefined, undefined, false, downloadTargetWeek); }}
                    className="w-full px-4 py-2.5 text-left text-xs hover:bg-teal-50 text-slate-700 hover:text-teal-700 flex items-center gap-2.5 transition-colors cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 group-hover:text-teal-700">Unduh Kartu CLOSED (JPG ZIP)</p>
                      <p className="text-[10px] text-slate-400">
                        {downloadTargetWeek !== 'ALL' ? `Khusus kartu CLOSED ${downloadTargetWeek}` : 'Seluruh kartu CLOSED dari semua minggu'}
                      </p>
                    </div>
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    type="button"
                    onClick={() => { setShowDownloadMenu(false); handleDownloadTicketsZip('ALL', undefined, undefined, false, downloadTargetWeek); }}
                    className="w-full px-4 py-2.5 text-left text-xs hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 flex items-center gap-2.5 transition-colors cursor-pointer group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Archive className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 group-hover:text-indigo-700">Unduh Semua Kartu (OPEN & CLOSED)</p>
                      <p className="text-[10px] text-slate-400">
                        {downloadTargetWeek !== 'ALL' ? `Seluruh temuan ${downloadTargetWeek}` : 'Seluruh temuan dari semua minggu'}
                      </p>
                    </div>
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    type="button"
                    onClick={() => { setShowDownloadMenu(false); handleDownloadTicketsZip('ALL', undefined, undefined, true, downloadTargetWeek); }}
                    className="w-full px-4 py-2 text-left text-[11px] hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Unduh Foto Mentah Saja (Tanpa Kartu Teks)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tombol Buka Galeri Foto */}
          <button 
            onClick={loadGallery}
            type="button"
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-950/40 border border-teal-400/30 transition-all transform hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <ImageIcon className="w-4 h-4 text-white" />
            <span>Galeri Foto</span>
            <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black">
              {totalGalleryPhotosCount > 0 ? totalGalleryPhotosCount : 'Foto'}
            </span>
          </button>
        </div>
      </PageHeader>

      <DevModeAccordion 
        devOptions={devOptions} 
        setDevOptions={setDevOptions} 
        inspectorNik={inspectorNik} 
      />

      {/* Active Week Filter Indicator Banner */}
      {selectedTicketWeek !== 'ALL' && (
        <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-2xl px-4 py-3 text-xs text-teal-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-teal-600 shrink-0" />
            <span>Menampilkan temuan khusus: <strong className="font-bold text-teal-950">{selectedTicketWeek}</strong></span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedTicketWeek('ALL')}
            className="text-xs font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
          >
            Tampilkan Semua Minggu
          </button>
        </div>
      )}

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
        ) : displayKeys.length === 0 ? (
           <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
             <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto" />
             <p className="text-slate-700 font-bold text-base">Tidak Ada Tiket pada {selectedTicketWeek}</p>
             <p className="text-slate-400 text-xs">Tidak ada temuan inspeksi dengan status {filter === 'OPEN' ? 'Terbuka' : filter === 'CLOSED' ? 'Selesai' : 'apapun'} pada minggu ini.</p>
             <button
               type="button"
               onClick={() => setSelectedTicketWeek('ALL')}
               className="px-4 py-2 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-all cursor-pointer shadow-2xs"
             >
               Tampilkan Semua Minggu
             </button>
           </div>
        ) : (
           displayKeys.map((key) => {
              const group = groupedTickets[key];
              return (
                <div key={key} className="space-y-4">
                  <div className="flex items-center justify-between gap-2 mb-2 px-1 flex-wrap">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-amber-500" />
                      <h3 className="font-bold text-slate-800 text-base">{group.label}</h3>
                      <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                        {group.tickets.length} Tiket
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleDownloadTicketsZip('OPEN', group.tickets.filter((t: any) => t.status?.toUpperCase() === 'OPEN'), `${group.label}_OPEN`)}
                        disabled={isZippingTickets}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                        title={`Unduh kartu temuan OPEN khusus ${group.label}`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Unduh OPEN ({group.tickets.filter((t: any) => t.status?.toUpperCase() === 'OPEN').length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadTicketsZip('CLOSED', group.tickets.filter((t: any) => t.status?.toUpperCase() === 'CLOSED'), `${group.label}_CLOSED`)}
                        disabled={isZippingTickets}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                        title={`Unduh kartu temuan CLOSED khusus ${group.label}`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                        <span>Unduh CLOSED ({group.tickets.filter((t: any) => t.status?.toUpperCase() === 'CLOSED').length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadTicketsZip('CURRENT_WEEK', group.tickets, group.label)}
                        disabled={isZippingTickets}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                        title={`Unduh seluruh kartu temuan ${group.label}`}
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Unduh Semua ({group.tickets.length})</span>
                      </button>
                    </div>
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
                                   {/* Direct Action Buttons on Thumbnail */}
                                   <div className="absolute top-2 right-2 flex items-center gap-1">
                                     <button
                                       type="button"
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         handleDownloadSingleTicketPhoto(t, isOp ? 'OPEN' : 'CLOSED');
                                       }}
                                       className="bg-slate-900/75 hover:bg-slate-900 text-white p-1.5 rounded-md backdrop-blur-sm shadow transition-opacity opacity-80 hover:opacity-100 flex items-center gap-1 text-[11px] cursor-pointer"
                                       title="Unduh Foto Ini (Format Standar)"
                                     >
                                       <Download className="w-3.5 h-3.5" />
                                     </button>
                                     <button
                                       type="button"
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         setSelectedImage(fotoUrl);
                                       }}
                                       className="bg-slate-900/75 hover:bg-slate-900 text-white p-1.5 rounded-md backdrop-blur-sm shadow transition-opacity opacity-80 hover:opacity-100 flex items-center gap-1 text-[11px] cursor-pointer"
                                       title="Perbesar Foto"
                                     >
                                       <ZoomIn className="w-3.5 h-3.5" />
                                     </button>
                                   </div>
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
                                  <h4 className="font-bold text-slate-900 text-sm leading-tight line-clamp-1 mb-1.5" title={t.location}>
                                    {t.location}
                                  </h4>
                                  <CompactFindingPreview description={t.description} maxItems={2} className="text-slate-600" />
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
