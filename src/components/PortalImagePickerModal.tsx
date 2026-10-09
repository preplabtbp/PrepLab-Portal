import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  UploadCloud, 
  FolderHeart, 
  Sparkles, 
  Link as LinkIcon, 
  Check, 
  Search, 
  RefreshCw, 
  Loader2, 
  Image as ImageIcon, 
  ExternalLink,
  Trash2,
  FileImage,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export const PORTAL_IMAGE_PRESETS = [
  { id: 'mining_site', name: 'Site Tambang Nikel', category: 'Mining', url: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?q=80&w=1600&auto=format&fit=crop' },
  { id: 'lab_modern', name: 'Laboratorium Kimia Modern', category: 'Lab', url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1600&auto=format&fit=crop' },
  { id: 'metallurgy', name: 'Analisis Spektrum XRF & Lab', category: 'Lab', url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=1600&auto=format&fit=crop' },
  { id: 'industrial', name: 'Industrial & Crusher Plant', category: 'Plant', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=1600&auto=format&fit=crop' },
  { id: 'mineral_rock', name: 'Geologi Ore & Mineral', category: 'Geology', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1600&auto=format&fit=crop' },
  { id: 'office_modern', name: 'Administrasi & Workstation', category: 'Admin', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1600&auto=format&fit=crop' },
  { id: 'teal_gradient', name: 'Minimalist Teal Glow', category: 'Minimalist', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1600&auto=format&fit=crop' },
  { id: 'dark_carbon', name: 'Dark Slate Hexagon Matrix', category: 'Minimalist', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1600&auto=format&fit=crop' },
  { id: 'safety_first', name: 'K3 & Safety Mining Culture', category: 'Mining', url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=1600&auto=format&fit=crop' }
];

export interface GalleryFileItem {
  id: string;
  name: string;
  mimeType: string;
  url: string;
  thumbnail: string;
  size: number;
  createdTime: string;
}

export interface PortalImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (url: string) => void;
  currentImage?: string;
  title?: string;
  description?: string;
  allowClear?: boolean;
  onClearImage?: () => void;
}

export function PortalImagePickerModal({
  isOpen,
  onClose,
  onSelectImage,
  currentImage = '',
  title = 'Pilih atau Unggah Gambar',
  description = 'Pilih dari folder Galeri Portal Google Drive, unggah gambar baru, atau gunakan preset tema.',
  allowClear = true,
  onClearImage
}: PortalImagePickerModalProps) {
  const [activeTab, setActiveTab] = useState<'drive' | 'upload' | 'preset' | 'url'>('drive');
  
  // Selection state
  const [selectedUrl, setSelectedUrl] = useState<string>(currentImage || '');
  const [urlInput, setUrlInput] = useState<string>(currentImage || '');

  // Gallery state
  const [galleryFiles, setGalleryFiles] = useState<GalleryFileItem[]>([]);
  const [loadingGallery, setLoadingGallery] = useState<boolean>(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initial selection
  useEffect(() => {
    if (isOpen) {
      setSelectedUrl(currentImage || '');
      setUrlInput(currentImage || '');
      fetchGalleryFiles();
    }
  }, [isOpen, currentImage]);

  // Fetch Galeri Portal from Drive
  const fetchGalleryFiles = async () => {
    setLoadingGallery(true);
    setGalleryError(null);
    try {
      const res = await fetch('/api/gallery');
      if (!res.ok) throw new Error(`HTTP ${res.status}: Gagal memuat galeri portal`);
      const data = await res.json();
      if (data.success && Array.isArray(data.files)) {
        setGalleryFiles(data.files);
      } else {
        setGalleryFiles([]);
      }
    } catch (err: any) {
      console.error('[PortalImagePicker] Error fetching gallery:', err);
      setGalleryError(err.message || 'Gagal memuat galeri dari Google Drive');
    } finally {
      setLoadingGallery(false);
    }
  };

  // Filter gallery images by search
  const filteredGallery = useMemo(() => {
    if (!searchQuery.trim()) return galleryFiles;
    const q = searchQuery.toLowerCase().trim();
    return galleryFiles.filter(item => 
      (item.name || '').toLowerCase().includes(q) ||
      (item.mimeType || '').toLowerCase().includes(q)
    );
  }, [galleryFiles, searchQuery]);

  // Handle Drag & Drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processSelectedFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (PNG, JPG, WEBP, GIF)');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error('Ukuran gambar maksimal 25 MB');
      return;
    }
    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setUploadPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Execute Upload directly to Google Drive "Galeri Portal" folder
  const handleExecuteUpload = async () => {
    if (!uploadFile || !uploadPreview) return;
    setIsUploading(true);

    try {
      const res = await fetch('/api/gallery/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Data: uploadPreview,
          filename: uploadFile.name,
          mimeType: uploadFile.type
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengunggah gambar ke Drive');
      }

      toast.success('Gambar berhasil disimpan ke folder Galeri Portal Google Drive!');
      
      // Select uploaded image
      const newUrl = data.file.url;
      setSelectedUrl(newUrl);

      // Prepend to gallery files
      setGalleryFiles(prev => [data.file, ...prev]);

      // Reset upload state
      setUploadFile(null);
      setUploadPreview(null);

      // Switch to gallery tab so user can see it in context
      setActiveTab('drive');
    } catch (err: any) {
      console.error('[PortalImagePicker] Upload error:', err);
      toast.error(`Gagal mengunggah: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Apply final selection
  const handleConfirmSelection = () => {
    if (!selectedUrl) {
      toast.error('Pilih salah satu gambar terlebih dahulu');
      return;
    }
    onSelectImage(selectedUrl);
    onClose();
  };

  // Clear / remove image
  const handleClear = () => {
    if (onClearImage) {
      onClearImage();
    } else {
      onSelectImage('');
    }
    setSelectedUrl('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-xs">
              <FolderHeart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('drive')}
            className={`px-3.5 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'drive'
                ? 'border-teal-600 text-teal-700 dark:text-teal-400 bg-white dark:bg-slate-900 shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <FolderHeart className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Galeri Portal (Google Drive)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300 font-mono">
              {galleryFiles.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3.5 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'upload'
                ? 'border-teal-600 text-teal-700 dark:text-teal-400 bg-white dark:bg-slate-900 shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <UploadCloud className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Upload Baru ke Drive</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preset')}
            className={`px-3.5 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'preset'
                ? 'border-teal-600 text-teal-700 dark:text-teal-400 bg-white dark:bg-slate-900 shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Preset Tambang & Lab</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`px-3.5 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'url'
                ? 'border-teal-600 text-teal-700 dark:text-teal-400 bg-white dark:bg-slate-900 shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <LinkIcon className="w-4 h-4 text-indigo-500" />
            <span>Tautan URL Kustom</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-[340px]">
          {/* TAB 1: GALERI PORTAL (GOOGLE DRIVE) */}
          {activeTab === 'drive' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Search & Refresh Bar */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari gambar di folder Galeri Portal Google Drive..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={fetchGalleryFiles}
                  disabled={loadingGallery}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Segarkan daftar galeri dari Google Drive"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingGallery ? 'animate-spin text-teal-600' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>

              {/* Gallery Grid */}
              {loadingGallery ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                  <p className="text-xs font-semibold">Menghubungkan ke folder &apos;Galeri Portal&apos; Google Drive...</p>
                </div>
              ) : galleryError ? (
                <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                  <p className="text-xs font-bold text-rose-800 dark:text-rose-300">{galleryError}</p>
                  <button
                    type="button"
                    onClick={fetchGalleryFiles}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    Coba Lagi
                  </button>
                </div>
              ) : filteredGallery.length === 0 ? (
                <div className="py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
                    <FolderHeart className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {searchQuery ? 'Tidak ada gambar yang cocok dengan kata kunci' : 'Belum Ada Gambar di Folder Galeri Portal'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                      {searchQuery 
                        ? 'Coba gunakan kata kunci pencarian lain atau segarkan galeri.' 
                        : 'Unggah gambar baru untuk menyimpannya ke folder Galeri Portal Google Drive secara permanen.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload Gambar Pertama Sekarang</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[460px] overflow-y-auto p-1">
                  {filteredGallery.map((file) => {
                    const isSelected = selectedUrl === file.url;
                    return (
                      <div
                        key={file.id}
                        onClick={() => setSelectedUrl(file.url)}
                        className={`group relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all aspect-video bg-slate-100 dark:bg-slate-800 shadow-xs ${
                          isSelected
                            ? 'border-teal-600 ring-4 ring-teal-500/20 scale-[1.02]'
                            : 'border-slate-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-500 hover:shadow-md'
                        }`}
                      >
                        <img
                          src={file.thumbnail}
                          alt={file.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            // Fallback if proxy stream loads slow
                            (e.currentTarget as HTMLImageElement).src = file.url;
                          }}
                        />

                        {/* File Name & Info Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent p-2.5 flex flex-col justify-end">
                          <span className="text-[11px] font-bold text-white truncate drop-shadow-xs">
                            {file.name}
                          </span>
                          <span className="text-[9px] text-slate-300 font-mono">
                            {file.size ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : 'Google Drive'}
                          </span>
                        </div>

                        {/* Selected Checkmark Badge */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 p-1 rounded-full bg-teal-600 text-white shadow-lg animate-in zoom-in-75">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: UPLOAD BARU KE GOOGLE DRIVE */}
          {activeTab === 'upload' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {!uploadPreview ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`py-14 px-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    isDragOver
                      ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/20 scale-[1.01]'
                      : 'border-slate-300 dark:border-slate-700 hover:border-teal-500 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-teal-50/20'
                  }`}
                >
                  <div className="w-16 h-16 rounded-3xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-inner mb-3">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
                    Tarik & Lepaskan Gambar di Sini, atau Klik untuk Memilih
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
                    Gambar akan langsung otomatis tersimpan di folder <strong className="text-teal-700 dark:text-teal-400 font-bold">&quot;Galeri Portal&quot;</strong> di Google Drive.
                  </p>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer pointer-events-none"
                  >
                    Pilih File Gambar
                  </button>
                  <span className="text-[10px] text-slate-400 mt-3 font-mono">
                    Mendukung format JPG, PNG, WEBP, GIF (Maks. 25 MB)
                  </span>
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                      <FileImage className="w-4 h-4 text-teal-600" />
                      <span>{uploadFile?.name || 'File Gambar Terpilih'}</span>
                      <span className="text-slate-400 text-[10px] font-mono">
                        ({uploadFile ? (uploadFile.size / (1024 * 1024)).toFixed(2) : '0'} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => {
                        setUploadFile(null);
                        setUploadPreview(null);
                      }}
                      className="text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                    >
                      Ganti File
                    </button>
                  </div>

                  {/* Image Preview Box */}
                  <div className="w-full h-48 sm:h-64 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 flex items-center justify-center relative">
                    <img
                      src={uploadPreview}
                      alt="Upload Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Upload Action Button */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => {
                        setUploadFile(null);
                        setUploadPreview(null);
                      }}
                      className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={handleExecuteUpload}
                      className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Menyimpan ke Google Drive Galeri Portal...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4" />
                          <span>Upload &amp; Simpan ke Galeri Portal Drive</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PRESET TAMBANG & LAB */}
          {activeTab === 'preset' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilihan banner tema resmi berkualitas tinggi untuk area tambang nikel, laboratorium kimia, XRF spektrum, dan administrasi.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto p-1">
                {PORTAL_IMAGE_PRESETS.map((preset) => {
                  const isSelected = selectedUrl === preset.url;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => setSelectedUrl(preset.url)}
                      className={`group relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all aspect-video shadow-xs ${
                        isSelected
                          ? 'border-teal-600 ring-4 ring-teal-500/20 scale-[1.02]'
                          : 'border-slate-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-500 hover:shadow-md'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2.5 flex flex-col justify-end">
                        <span className="text-[11px] font-bold text-white drop-shadow-xs">
                          {preset.name}
                        </span>
                        <span className="text-[9px] text-teal-300 font-semibold uppercase tracking-wider">
                          {preset.category}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 p-1 rounded-full bg-teal-600 text-white shadow-lg animate-in zoom-in-75">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: URL KUSTOM */}
          {activeTab === 'url' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tautan Gambar Langsung (URL)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://images.unsplash.com/... atau tautan gambar lainnya"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (urlInput.trim()) {
                        setSelectedUrl(urlInput.trim());
                        toast.success('Pratinjau gambar URL diterapkan');
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-950 text-white dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    Pratinjau
                  </button>
                </div>
              </div>

              {selectedUrl && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Pratinjau Gambar:</span>
                  <div className="w-full h-48 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
                    <img
                      src={selectedUrl}
                      alt="URL Preview"
                      className="w-full h-full object-cover"
                      onError={() => {
                        toast.error('Gagal memuat URL gambar tersebut');
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer: Live Selection preview & Action buttons */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: Active Selection preview */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {selectedUrl ? (
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-teal-500 shadow-xs shrink-0 bg-slate-200">
                  <img src={selectedUrl} alt="Selected" className="w-full h-full object-cover" />
                </div>
                <div className="text-left overflow-hidden">
                  <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>Gambar Terpilih</span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono truncate max-w-[200px] sm:max-w-[260px]">
                    {selectedUrl}
                  </p>
                </div>
              </div>
            ) : (
              <span className="text-xs text-slate-400 italic">
                Belum ada gambar yang dipilih
              </span>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
            {allowClear && (
              <button
                type="button"
                onClick={handleClear}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              >
                Hapus Cover
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleConfirmSelection}
              disabled={!selectedUrl}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Gunakan Gambar Ini</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
