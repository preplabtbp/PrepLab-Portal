import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, Button, Input } from './ui';
import { 
  ArrowLeft, Folder, File, Upload, Trash2, Download, Search, History, Cloud, 
  FolderPlus, MoveRight, ExternalLink, MoreVertical, Home, Users, Clock, Settings, 
  LogOut, ChevronRight, FileText, Image as ImageIcon, Film, Archive, FileSpreadsheet, 
  Shield, Lock, Bell, Check, Plus, FolderCheck, HardDrive, Sparkles, RefreshCw,
  FolderOpen, User
} from 'lucide-react';
import { toast } from 'sonner';

interface PreplabCloudScreenProps {
  onBack: () => void;
  userProfile: any;
  inspectorNik: string;
  inspectorName: string;
}

const ALL_FOLDERS = [
  { id: '1Z1as0leRN6MbtadW7yOIAXYzAswDWmmt', name: 'GTS', section: 'GTS' },
  { id: '1CUO6uL6VubERhfU4SPouQeY1o675zyuP', name: 'Administration', section: 'Administration' },
  { id: '1GvbUwXTuDnD-H2OAByIsWiafQshlpKNI', name: 'Laboratory', section: 'Laboratory' },
  { id: '116OiKilCYNfHwq6QEePI3SiVuZIv2lNL', name: 'Preparation', section: 'Preparation' },
  { id: '1fVwgfGN3fL2kB83DomKF9mELgez1Skv5', name: 'Inventory Control', section: 'Inventory Control' },
  { id: '15XSGd3XNR_O49lD92aGN3ol_MWkh3qr7', name: 'Maintenance', section: 'Maintenance' },
  { id: '1YjbWGseDQNB5Wha1dZkq4hcUyg8ZutV0', name: 'Quality Assurance', section: 'QA' },
  { id: '1i92Q6omfqFBXSjQL-gCeoV6mC6ThKpcE', name: 'General Information', section: 'ALL' }
];

function getFileIcon(mimeType?: string, fileName?: string) {
  const m = (mimeType || '').toLowerCase();
  const n = (fileName || '').toLowerCase();

  if (m.includes('folder')) {
    return {
      icon: <Folder className="w-5 h-5 fill-current" />,
      bg: 'bg-emerald-100 text-emerald-600 border border-emerald-200',
      label: 'Folder'
    };
  }
  if (m.includes('pdf') || n.endsWith('.pdf')) {
    return {
      icon: <FileText className="w-5 h-5 text-rose-600" />,
      bg: 'bg-rose-50 text-rose-600 border border-rose-200',
      label: 'PDF'
    };
  }
  if (m.includes('sheet') || m.includes('excel') || m.includes('csv') || n.endsWith('.xlsx') || n.endsWith('.xls') || n.endsWith('.csv')) {
    return {
      icon: <FileSpreadsheet className="w-5 h-5 text-emerald-600" />,
      bg: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
      label: 'Spreadsheet'
    };
  }
  if (m.includes('image') || n.endsWith('.png') || n.endsWith('.jpg') || n.endsWith('.jpeg') || n.endsWith('.webp')) {
    return {
      icon: <ImageIcon className="w-5 h-5 text-purple-600" />,
      bg: 'bg-purple-50 text-purple-600 border border-purple-200',
      label: 'Image'
    };
  }
  if (m.includes('video') || m.includes('audio') || n.endsWith('.mp4') || n.endsWith('.mkv') || n.endsWith('.mp3')) {
    return {
      icon: <Film className="w-5 h-5 text-sky-600" />,
      bg: 'bg-sky-50 text-sky-600 border border-sky-200',
      label: 'Media'
    };
  }
  if (m.includes('zip') || m.includes('rar') || m.includes('tar') || m.includes('archive') || n.endsWith('.zip') || n.endsWith('.rar')) {
    return {
      icon: <Archive className="w-5 h-5 text-amber-600" />,
      bg: 'bg-amber-50 text-amber-600 border border-amber-200',
      label: 'Archive'
    };
  }
  return {
    icon: <File className="w-5 h-5 text-slate-500" />,
    bg: 'bg-slate-100 text-slate-600 border border-slate-200',
    label: 'File'
  };
}

function FileMenu({ file, onMove, onDelete }: { file: any, onMove: () => void, onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const isFolder = file.mimeType?.includes('folder');
  
  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button 
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        title="Opsi file"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 w-48 rounded-2xl shadow-xl border border-slate-200/90 bg-white py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-slate-800">
            {!isFolder && (
              <button 
                onClick={() => { setOpen(false); onMove(); }}
                className="w-full text-left px-3.5 py-2 text-xs font-bold flex items-center gap-2.5 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              >
                <MoveRight className="w-4 h-4 text-slate-400" /> Pindahkan
              </button>
            )}
            
            {file.webContentLink && (
              <a 
                href={file.webContentLink}
                target="_blank" 
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="w-full text-left px-3.5 py-2 text-xs font-bold flex items-center gap-2.5 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-600" /> Download
              </a>
            )}
            
            {!isFolder && file.webViewLink && (
              <a 
                href={file.webViewLink}
                target="_blank" 
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="w-full text-left px-3.5 py-2 text-xs font-bold flex items-center gap-2.5 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-sky-600" /> Buka di Drive
              </a>
            )}
            
            <button 
              onClick={() => { setOpen(false); onDelete(); }}
              className="w-full text-left px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-500" /> Hapus
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ScrollingText({ text, className }: { text: string, className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [overflowAmount, setOverflowAmount] = useState(0);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const sw = textRef.current.scrollWidth;
        const cw = containerRef.current.clientWidth;
        setOverflowAmount(sw > cw ? sw - cw : 0);
      }
    };
    
    setTimeout(checkOverflow, 100);
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [text]);

  return (
    <div ref={containerRef} className={`overflow-hidden relative w-full ${className || ''}`} style={{ '--overflow': `-${overflowAmount + 20}px` } as React.CSSProperties}>
      <div 
        ref={textRef}
        className={overflowAmount === 0 ? 'truncate block w-full' : 'whitespace-nowrap inline-block'}
        style={{
           animation: overflowAmount > 0 ? `marquee-custom 6s linear infinite alternate` : 'none'
        }}
        title={text}
      >
        {text}
      </div>
    </div>
  );
}

export function PreplabCloudScreen({ onBack, userProfile, inspectorNik, inspectorName }: PreplabCloudScreenProps) {
  const [allowedFolders, setAllowedFolders] = useState<any[]>([]);
  const [folderPath, setFolderPath] = useState<any[]>([]);
  const currentFolder = folderPath.length > 0 ? folderPath[folderPath.length - 1] : null;
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [movingFile, setMovingFile] = useState<any>(null);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  
  const [logs, setLogs] = useState<any[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [logDateFilter, setLogDateFilter] = useState('');
  const uploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    determineAllowedFolders();
    fetchLogs();
  }, [userProfile, inspectorNik]);

  const determineAllowedFolders = () => {
    const cleanNik = (inspectorNik || userProfile?.nik || '').trim().toUpperCase();
    const isSuperNik = 
      cleanNik === '02D24000043' || 
      cleanNik === '02D25000055' || 
      cleanNik === 'M0403240177' || 
      cleanNik === '04D25000064' || 
      cleanNik === 'PREPLABADMIN' || 
      cleanNik === 'ADMIN' ||
      cleanNik.includes('02D24000043');

    if (isSuperNik) {
      setAllowedFolders(ALL_FOLDERS);
      return;
    }

    if (!userProfile) return;
    if (userProfile.pt === 'GTS') {
      const gtsFolder = ALL_FOLDERS.find(f => f.section === 'GTS');
      setAllowedFolders(gtsFolder ? [gtsFolder] : []);
      if (gtsFolder) {
        setFolderPath([gtsFolder]);
        fetchFiles(gtsFolder.id);
      }
      return;
    }

    const jab = (userProfile.jabatan || '').toLowerCase();
    const sec = (userProfile.section || '').toLowerCase();
    const div = (userProfile.divisi || '').toLowerCase();
    
    let isSuper = false;
    if (jab.includes('manager') && (jab.includes('preparation') || jab.includes('laboratory'))) isSuper = true;
    if (jab.includes('superintendent') && (jab.includes('laboratory') || jab.includes('preparation'))) isSuper = true;
    if (sec.includes('qa') || sec.includes('quality assurance')) isSuper = true;
    
    if (isSuper) {
      setAllowedFolders(ALL_FOLDERS);
    } else {
      const filtered = ALL_FOLDERS.filter(f => {
         if (f.section === 'ALL') return true;
         const searchStr = `${sec} ${div}`.toLowerCase();
         return searchStr.includes(f.section.toLowerCase());
      });
      setAllowedFolders(filtered);
      if (filtered.length === 1) {
        setFolderPath([filtered[0]]);
        fetchFiles(filtered[0].id);
      }
    }
  };

  const fetchFiles = async (folderId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/preplab-cloud-files?folderId=${folderId}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch (e) {
      toast.error('Gagal mengambil file');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/preplab-cloud-logs');
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch (e) {}
  };

  const openFolder = (folder: any) => {
    setFolderPath(prev => [...prev, folder]);
    fetchFiles(folder.id);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !currentFolder) return;
    try {
      const res = await fetch('/api/preplab-cloud-create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName, parentId: currentFolder.id })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Folder berhasil dibuat');
        setCreatingFolder(false);
        setNewFolderName('');
        fetchFiles(currentFolder.id);
        
        await fetch('/api/preplab-cloud-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: inspectorNik,
            userName: inspectorName,
            action: 'Create Folder',
            fileName: newFolderName,
            folderId: currentFolder.id,
            folderName: currentFolder.name
          })
        });
      } else {
        toast.error('Gagal membuat folder: ' + data.error);
      }
    } catch (e: any) {
      toast.error('Terjadi kesalahan: ' + e.message);
    }
  };

  const handleMoveFile = async (fileId: string, newParentId: string) => {
    try {
      const res = await fetch('/api/preplab-cloud-move-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, newParentId })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('File berhasil dipindahkan');
        setMovingFile(null);
        if (currentFolder) fetchFiles(currentFolder.id);
        const folderName = (folderPath.length > 1 && newParentId === folderPath[folderPath.length - 2].id) ? folderPath[folderPath.length - 2].name : files.find(f => f.id === newParentId)?.name || 'Folder Tujuan';
        await fetch('/api/preplab-cloud-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: inspectorNik,
            userName: inspectorName,
            action: 'Move File',
            fileName: movingFile?.name || 'File',
            folderId: newParentId,
            folderName: folderName
          })
        });
        fetchLogs();
      } else {
        toast.error('Gagal memindahkan file: ' + data.error);
      }
    } catch (e: any) {
      toast.error('Terjadi kesalahan: ' + e.message);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files ? Array.from(e.target.files) : [];
    if (rawFiles.length === 0) return;
    if (!currentFolder) {
      toast.error('Silakan buka salah satu folder section terlebih dahulu untuk mengupload.');
      return;
    }
    const inputEl = e.target;
    setUploading(true);
    const toastId = toast.loading(`Mempersiapkan ${rawFiles.length} file untuk diunggah...`);
    let successCount = 0;
    let overwriteCount = 0;

    try {
      for (let i = 0; i < rawFiles.length; i++) {
        const file = rawFiles[i];
        toast.loading(`Mengunggah (${i + 1}/${rawFiles.length}): ${file.name}...`, { id: toastId });

        try {
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const res = await fetch('/api/preplab-cloud-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base64Data,
              mimeType: file.type,
              filename: file.name,
              folderId: currentFolder.id
            })
          });

          const data = await res.json();
          if (res.ok && data.success) {
            successCount++;
            if (data.overwritten) {
              overwriteCount++;
            }
            try {
              await fetch('/api/preplab-cloud-logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: inspectorNik || 'System',
                  userName: inspectorName || 'User',
                  action: data.overwritten ? 'Overwrite File' : 'Upload File',
                  fileName: file.name,
                  folderId: currentFolder.id,
                  folderName: currentFolder.name
                })
              });
            } catch (_) {}
          } else {
            console.error('Gagal upload', file.name, data);
          }
        } catch (fErr) {
          console.error('Error saat membaca file:', file.name, fErr);
        }
      }

      if (successCount > 0) {
        const overwriteMsg = overwriteCount > 0 ? ` (${overwriteCount} file ditimpa)` : '';
        toast.success(`${successCount} file berhasil diunggah${overwriteMsg}!`, { id: toastId });
        fetchFiles(currentFolder.id);
        fetchLogs();
      } else {
        toast.error('Gagal mengupload file', { id: toastId });
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan saat upload: ' + (err.message || 'Error'), { id: toastId });
    } finally {
      setUploading(false);
      if (inputEl) inputEl.value = '';
    }
  };

  const handleDelete = async (file: any) => {
    if (!window.confirm(`Pindahkan ${file.name} ke sampah?`)) return;
    try {
      const res = await fetch(`/api/preplab-cloud-files/${file.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success('File dihapus');
        if (currentFolder) fetchFiles(currentFolder.id);
      } else {
        toast.error('Gagal menghapus');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan saat hapus');
    }
  };

  const formatSize = (bytes?: string | number) => {
    if (!bytes) return '';
    const b = typeof bytes === 'number' ? bytes : parseInt(bytes, 10);
    if (!b || isNaN(b)) return '';
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    if (b < 1024 * 1024 * 1024) return (b / (1024 * 1024)).toFixed(1) + ' MB';
    return (b / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const filteredFiles = useMemo(() => {
    return files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
  }, [files, search]);

  const fileStats = useMemo(() => {
    let videosSize = 0;
    let photosSize = 0;
    let docsSize = 0;
    let otherSize = 0;
    let videosCount = 0;
    let photosCount = 0;
    let docsCount = 0;
    let otherCount = 0;
    let totalBytes = 0;

    files.forEach(f => {
      const sz = parseInt(f.size || '0', 10) || 0;
      totalBytes += sz;
      const m = (f.mimeType || '').toLowerCase();
      const n = (f.name || '').toLowerCase();

      if (m.includes('video') || m.includes('audio') || n.endsWith('.mp4') || n.endsWith('.mkv') || n.endsWith('.mp3')) {
        videosSize += sz;
        videosCount++;
      } else if (m.includes('image') || n.endsWith('.png') || n.endsWith('.jpg') || n.endsWith('.jpeg') || n.endsWith('.webp')) {
        photosSize += sz;
        photosCount++;
      } else if (m.includes('pdf') || m.includes('sheet') || m.includes('excel') || m.includes('doc') || n.endsWith('.pdf') || n.endsWith('.xlsx') || n.endsWith('.csv') || n.endsWith('.docx')) {
        docsSize += sz;
        docsCount++;
      } else if (!m.includes('folder')) {
        otherSize += sz;
        otherCount++;
      }
    });

    return {
      videosSize, photosSize, docsSize, otherSize,
      videosCount, photosCount, docsCount, otherCount,
      totalBytes,
      totalFiles: files.filter(f => !f.mimeType?.includes('folder')).length
    };
  }, [files]);

  // Quick access file picks (first 3 files or highlighted)
  const quickAccessFiles = useMemo(() => {
    return files.filter(f => !f.mimeType?.includes('folder')).slice(0, 3);
  }, [files]);

  return (
    <div className="w-full min-h-screen bg-[#edf6f0] p-3 sm:p-5 md:p-6 lg:p-8 flex items-center justify-center font-sans antialiased text-slate-800">
      {/* Outer Floating Main Dashboard Container (Aesthetic MyCloud Canvas) */}
      <div className="w-full max-w-[1520px] bg-white rounded-3xl sm:rounded-[36px] shadow-2xl shadow-emerald-950/10 border border-emerald-100/80 overflow-hidden flex flex-col xl:flex-row min-h-[850px] relative">
        
        {/* ========================================================================= */}
        {/* 1. SLIM LEFT ICON DOCK (Emerald Theme) */}
        {/* ========================================================================= */}
        <div className="w-full xl:w-20 bg-[#289E70] text-white flex xl:flex-col items-center justify-between p-3.5 sm:p-4 shrink-0 z-20 shadow-md xl:shadow-none">
          <div className="flex xl:flex-col items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setShowLogs(false);
                setFolderPath([]);
                if (allowedFolders.length === 1) {
                  openFolder(allowedFolders[0]);
                }
              }}
              className="w-11 h-11 rounded-2xl bg-white text-[#289E70] flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer"
              title="PrepLab Cloud Home"
            >
              <Home className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setShowLogs(false)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                !showLogs ? 'bg-white/20 text-white' : 'text-emerald-100 hover:bg-white/10'
              }`}
              title="Folder Section"
            >
              <Folder className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setShowLogs(true)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                showLogs ? 'bg-white text-[#289E70] shadow-sm' : 'text-emerald-100 hover:bg-white/10'
              }`}
              title="Riwayat Log Aktivitas"
            >
              <History className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (currentFolder) fetchFiles(currentFolder.id);
                fetchLogs();
                toast.success('Data cloud diperbarui');
              }}
              className="w-10 h-10 rounded-xl text-emerald-100 hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          <div className="flex xl:flex-col items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-xl text-white hover:bg-white/15 flex items-center justify-center transition-all cursor-pointer"
              title="Kembali ke Menu Utama"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. SECONDARY LEFT SIDEBAR (MyCloud Tree & Navigation) */}
        {/* ========================================================================= */}
        <div className="w-full xl:w-64 bg-slate-50/70 border-b xl:border-b-0 xl:border-r border-slate-100 p-5 sm:p-6 shrink-0 flex flex-col justify-between">
          <div className="space-y-6">
            {/* Logo Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#2EA074] to-[#1E7D58] text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-black text-lg text-slate-900 tracking-tight leading-none">PrepLab Cloud</h1>
                <p className="text-[11px] font-bold text-slate-400 mt-1">Google Drive Storage</p>
              </div>
            </div>

            {/* Create New / Action Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCreateMenu(!showCreateMenu)}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#2EA074] to-[#258f66] hover:from-[#299369] hover:to-[#1e7e59] active:scale-98 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Create New</span>
              </button>

              {/* Create Menu Dropdown */}
              {showCreateMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowCreateMenu(false)} />
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-2 z-40 space-y-1 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateMenu(false);
                        uploadInputRef.current?.click();
                      }}
                      className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-emerald-50 text-slate-800 text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Upload className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="leading-tight">Upload File</p>
                        <p className="text-[10px] text-slate-400 font-medium">Unggah ke folder aktif</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateMenu(false);
                        if (!currentFolder) {
                          toast.error('Buka salah satu folder section terlebih dahulu');
                          return;
                        }
                        setCreatingFolder(true);
                      }}
                      className="w-full text-left px-3.5 py-2.5 rounded-xl hover:bg-emerald-50 text-slate-800 text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <FolderPlus className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="leading-tight">Buat Folder Baru</p>
                        <p className="text-[10px] text-slate-400 font-medium">Buat sub-folder baru</p>
                      </div>
                    </button>
                  </div>
                </>
              )}

              {/* Hidden file input */}
              <input 
                type="file" 
                ref={uploadInputRef}
                multiple
                className="hidden" 
                onChange={handleUpload}
              />
            </div>

            {/* Folder Tree List */}
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 px-2">My Files</p>
                <div className="space-y-1">
                  {allowedFolders.map(folder => {
                    const isSelected = currentFolder?.id === folder.id;
                    return (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => {
                          setShowLogs(false);
                          openFolder(folder);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-emerald-100/70 text-emerald-900 border border-emerald-200' 
                            : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Folder className={`w-4 h-4 shrink-0 ${isSelected ? 'text-emerald-700 fill-emerald-700' : 'text-slate-400'}`} />
                          <span className="truncate">{folder.name}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/80 text-slate-500 font-mono text-[9px] border border-slate-200/60 shrink-0">
                          {folder.section}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Navigation Links */}
              <div className="pt-2 border-t border-slate-200/70 space-y-1">
                <button
                  type="button"
                  onClick={() => setShowLogs(true)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer ${
                    showLogs ? 'bg-emerald-100/70 text-emerald-900 border border-emerald-200' : 'text-slate-600 hover:bg-slate-200/50'
                  }`}
                >
                  <History className="w-4 h-4 text-slate-400" />
                  <span>Log Aktivitas</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (folderPath.length > 0) {
                      const newPath = [...folderPath];
                      newPath.pop();
                      setFolderPath(newPath);
                      if (newPath.length > 0) {
                        fetchFiles(newPath[newPath.length - 1].id);
                      }
                    }
                  }}
                  disabled={folderPath.length === 0}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 text-slate-600 hover:bg-slate-200/50 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-400" />
                  <span>Kembali ke Atas</span>
                </button>
              </div>
            </div>
          </div>

          {/* User Section Badge at bottom of left sidebar */}
          <div className="pt-4 border-t border-slate-200/70 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs shrink-0">
              {inspectorName ? inspectorName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-xs text-slate-900 truncate">{inspectorName || 'User'}</p>
              <p className="text-[10px] text-slate-400 font-mono truncate">{inspectorNik}</p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. CENTER MAIN CONTENT AREA (Quick Access, Folders, Recent Files) */}
        {/* ========================================================================= */}
        <div className="flex-1 p-5 sm:p-7 md:p-8 flex flex-col justify-between overflow-y-auto custom-scrollbar space-y-7">
          <div className="space-y-7">
            {/* Top Search & Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5">
              {/* Search Pill Input */}
              <div className="relative flex-1 max-w-xl">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center pointer-events-none">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  placeholder="Cari file di PrepLab Cloud..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 transition-all outline-none shadow-2xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 shrink-0">
                {currentFolder && (
                  <button
                    type="button"
                    onClick={() => uploadInputRef.current?.click()}
                    disabled={uploading}
                    className="py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>Upload File</span>
                  </button>
                )}

                {currentFolder && (
                  <button
                    type="button"
                    onClick={() => setCreatingFolder(true)}
                    className="py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-slate-500" />
                    <span>Folder Baru</span>
                  </button>
                )}
              </div>
            </div>

            {/* Breadcrumb Path Bar */}
            {folderPath.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 overflow-x-auto py-1 custom-scrollbar">
                <button
                  type="button"
                  onClick={() => setFolderPath([])}
                  className="text-emerald-700 hover:underline flex items-center gap-1 shrink-0 font-bold cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Root</span>
                </button>
                {folderPath.map((f, i) => (
                  <React.Fragment key={f.id}>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                    <button
                      type="button"
                      onClick={() => {
                        const newPath = folderPath.slice(0, i + 1);
                        setFolderPath(newPath);
                        fetchFiles(f.id);
                      }}
                      className={`shrink-0 hover:underline cursor-pointer ${
                        i === folderPath.length - 1 ? 'font-black text-slate-900' : 'text-slate-600'
                      }`}
                    >
                      {f.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* IF SHOWING ACTIVITY LOGS */}
            {showLogs ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <h2 className="text-base font-black text-slate-900">Riwayat Log Aktivitas Cloud</h2>
                    <p className="text-xs text-slate-500 font-medium">Catatan upload, pemindahan, pembuatan folder, dan penghapusan file</p>
                  </div>
                  <input
                    type="date"
                    value={logDateFilter}
                    onChange={(e) => setLogDateFilter(e.target.value)}
                    className="py-1.5 px-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white shadow-2xs outline-none"
                  />
                </div>

                <div className="space-y-2.5">
                  {(() => {
                    const filteredLogs = logs.filter(log => {
                      if (!logDateFilter) return true;
                      try {
                        const d = new Date(log.timestamp);
                        const year = d.getFullYear();
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}` === logDateFilter;
                      } catch(e) { return true; }
                    });

                    if (filteredLogs.length === 0) {
                      return (
                        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs font-medium">
                          Tidak ada log aktivitas tercatat pada filter ini
                        </div>
                      );
                    }

                    return filteredLogs.map(log => (
                      <div key={log.id} className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            log.action === 'Upload' ? 'bg-emerald-100 text-emerald-700' :
                            log.action === 'Create Folder' ? 'bg-sky-100 text-sky-700' :
                            log.action === 'Move File' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {log.action === 'Upload' ? <Upload className="w-4 h-4" /> :
                             log.action === 'Create Folder' ? <FolderPlus className="w-4 h-4" /> :
                             log.action === 'Move File' ? <MoveRight className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 leading-snug">
                              <span className="font-black text-emerald-800">{log.userName}</span> {log.action === 'Upload' ? 'mengunggah' : log.action === 'Create Folder' ? 'membuat folder' : log.action === 'Move File' ? 'memindahkan' : 'menghapus'} <span className="font-extrabold text-slate-950">"{log.fileName}"</span>
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                              Folder: {log.folderName} • {new Date(log.timestamp).toLocaleString('id-ID')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            ) : (
              <>
                {/* SECTION 1: QUICK ACCESS CARDS */}
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <h2 className="text-sm font-black text-slate-900 tracking-tight">Quick Access</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Active Highlight Card (Emerald Card Styled like Reference Image) */}
                    <div className="bg-gradient-to-br from-[#2EA074] via-[#26976D] to-[#1C7B56] text-white p-4.5 rounded-2xl shadow-lg shadow-emerald-700/20 flex flex-col justify-between min-h-[125px] transition-all hover:scale-[1.01]">
                      <div className="flex items-start justify-between">
                        <div className="w-9 h-9 rounded-xl bg-white/25 backdrop-blur-md border border-white/30 text-white flex items-center justify-center shadow-xs">
                          <Folder className="w-5 h-5 fill-current" />
                        </div>
                        <div className="flex -space-x-2 overflow-hidden">
                          <div className="inline-block h-6 w-6 rounded-full ring-2 ring-emerald-500 bg-white/30 text-[9px] font-black flex items-center justify-center text-white">
                            GTS
                          </div>
                          <div className="inline-block h-6 w-6 rounded-full ring-2 ring-emerald-500 bg-white/40 text-[9px] font-black flex items-center justify-center text-white">
                            LAB
                          </div>
                          <div className="inline-block h-6 w-6 rounded-full ring-2 ring-emerald-500 bg-white text-emerald-800 text-[8.5px] font-black flex items-center justify-center">
                            +6
                          </div>
                        </div>
                      </div>

                      <div className="mt-2">
                        <h3 className="font-black text-sm tracking-tight leading-tight truncate">
                          {currentFolder ? currentFolder.name : 'PrepLab Sections'}
                        </h3>
                        <p className="text-[11px] text-emerald-100 font-semibold mt-0.5">
                          {files.length > 0 ? `${files.length} items file` : `${allowedFolders.length} folders`}
                        </p>
                      </div>
                    </div>

                    {/* Quick Access File 1 & 2 (Clean White Cards) */}
                    {quickAccessFiles.length > 0 ? (
                      quickAccessFiles.slice(0, 2).map(f => {
                        const style = getFileIcon(f.mimeType, f.name);
                        return (
                          <div 
                            key={f.id}
                            onClick={() => {
                              if (f.webViewLink) window.open(f.webViewLink, '_blank');
                            }}
                            className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer flex flex-col justify-between min-h-[125px]"
                          >
                            <div className="flex items-start justify-between">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${style.bg}`}>
                                {style.icon}
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                                {style.label}
                              </span>
                            </div>
                            <div className="mt-2 min-w-0">
                              <h4 className="font-black text-xs text-slate-900 truncate">{f.name}</h4>
                              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                                {formatSize(f.size) || 'Drive File'}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <>
                        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-[125px]">
                          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="mt-2">
                            <h4 className="font-black text-xs text-slate-900 truncate">SOP Preparation.pdf</h4>
                            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Dokumen Resmi</p>
                          </div>
                        </div>

                        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-2xs flex flex-col justify-between min-h-[125px]">
                          <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center">
                            <Film className="w-5 h-5" />
                          </div>
                          <div className="mt-2">
                            <h4 className="font-black text-xs text-slate-900 truncate">Tutorial QC.mp4</h4>
                            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Media Video</p>
                          </div>
                        </div>
                      </>
                    )}

                  </div>
                </div>

                {/* SECTION 2: FOLDERS GRID */}
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <h2 className="text-sm font-black text-slate-900 tracking-tight">Folders</h2>
                    {folderPath.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newPath = [...folderPath];
                          newPath.pop();
                          setFolderPath(newPath);
                          if (newPath.length > 0) fetchFiles(newPath[newPath.length - 1].id);
                        }}
                        className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Ke Folder Induk</span>
                      </button>
                    )}
                  </div>

                  {/* If at root, list the section folders. If inside folder, list subfolders */}
                  {(() => {
                    const subfolders = files.filter(f => f.mimeType?.includes('folder'));
                    const foldersToDisplay = folderPath.length === 0 ? allowedFolders : subfolders;

                    if (foldersToDisplay.length === 0 && folderPath.length > 0) {
                      return null; // No subfolders inside this folder, proceed directly to files
                    }

                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                        {foldersToDisplay.map(f => (
                          <div
                            key={f.id}
                            onClick={() => openFolder(f)}
                            className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-h-[110px]"
                          >
                            <div className="flex items-center justify-between">
                              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center group-hover:scale-105 transition-transform">
                                <Folder className="w-5 h-5 fill-current" />
                              </div>
                              <FileMenu file={f} onMove={() => setMovingFile(f)} onDelete={() => handleDelete(f)} />
                            </div>

                            <div className="mt-3 min-w-0">
                              <h3 className="font-black text-xs text-slate-900 truncate leading-snug">{f.name}</h3>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                                {f.section ? `Section: ${f.section}` : 'Folder'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* SECTION 3: RECENT FILES (Sleek Modern Table/List like Reference Image) */}
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <h2 className="text-sm font-black text-slate-900 tracking-tight">Recent Files</h2>
                    <span className="text-xs font-bold text-slate-400">
                      {filteredFiles.filter(f => !f.mimeType?.includes('folder')).length} file
                    </span>
                  </div>

                  {loading ? (
                    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 text-slate-400">
                      <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
                      <p className="text-xs font-semibold">Mengambil daftar file dari cloud...</p>
                    </div>
                  ) : filteredFiles.length === 0 ? (
                    <div className="text-center py-14 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 p-6">
                      <FolderOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="font-bold text-xs text-slate-600">Tidak ada file dalam folder ini</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Klik tombol "+ Create New" atau "Upload File" untuk menambahkan dokumen</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
                      {/* Table Header */}
                      <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-slate-50/80 border-b border-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-400">
                        <div className="col-span-6 sm:col-span-5">Name</div>
                        <div className="col-span-3 sm:col-span-3">Last Modified</div>
                        <div className="hidden sm:block sm:col-span-3">Size / Member</div>
                        <div className="col-span-3 sm:col-span-1 text-right">Action</div>
                      </div>

                      {/* Table Body */}
                      <div className="divide-y divide-slate-100">
                        {filteredFiles.map(file => {
                          const style = getFileIcon(file.mimeType, file.name);
                          const isFolder = file.mimeType?.includes('folder');

                          return (
                            <div
                              key={file.id}
                              onClick={() => {
                                if (isFolder) {
                                  openFolder(file);
                                } else if (file.webViewLink) {
                                  window.open(file.webViewLink, '_blank');
                                }
                              }}
                              className="grid grid-cols-12 gap-3 px-4 py-3.5 items-center hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                            >
                              {/* File Name & Icon */}
                              <div className="col-span-6 sm:col-span-5 flex items-center gap-3 min-w-0">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${style.bg}`}>
                                  {style.icon}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <ScrollingText text={file.name} className="font-bold text-xs text-slate-900 group-hover:text-emerald-800 transition-colors" />
                                </div>
                              </div>

                              {/* Last Modified Date */}
                              <div className="col-span-3 sm:col-span-3 text-[11px] font-semibold text-slate-500 font-mono">
                                {file.createdTime 
                                  ? new Date(file.createdTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                  : '-'}
                              </div>

                              {/* Size / Member Tag */}
                              <div className="hidden sm:block sm:col-span-3">
                                {isFolder ? (
                                  <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                    Folder
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-bold text-slate-500 font-mono">
                                    {formatSize(file.size) || 'Online Doc'}
                                  </span>
                                )}
                              </div>

                              {/* 3 Dots Action Menu */}
                              <div className="col-span-3 sm:col-span-1 text-right">
                                <FileMenu 
                                  file={file} 
                                  onMove={() => setMovingFile(file)} 
                                  onDelete={() => handleDelete(file)} 
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. RIGHT SIDEBAR (Storage Capacity Arc & Breakdown Overview) */}
        {/* ========================================================================= */}
        <div className="w-full xl:w-76 bg-slate-50/70 border-t xl:border-t-0 xl:border-l border-slate-100 p-5 sm:p-6 shrink-0 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            {/* User Greeting & Avatar Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-700 text-white flex items-center justify-center font-black text-xs shadow-xs border border-white">
                  {inspectorName ? inspectorName.charAt(0).toUpperCase() : 'A'}
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 leading-tight">
                    Hi, {inspectorName ? inspectorName.split(' ')[0] : 'User'}
                  </p>
                  <p className="text-[10px] text-emerald-700 font-bold">PrepLab Inspector</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowLogs(!showLogs)}
                className="w-8 h-8 rounded-xl bg-white border border-slate-200/90 text-slate-500 hover:text-emerald-700 flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
                title="Lihat Log"
              >
                <Bell className="w-4 h-4" />
              </button>
            </div>

            {/* STORAGE CAPACITY SEMI-CIRCLE ARC GAUGE (Stylized like Reference Image) */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs text-center flex flex-col items-center relative overflow-hidden">
              <div className="w-44 h-28 relative flex items-end justify-center mb-1">
                {/* SVG Rainbow Arc */}
                <svg className="w-44 h-44 -rotate-90 overflow-visible" viewBox="0 0 100 100">
                  {/* Background Arc */}
                  <path
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    fill="none"
                    stroke="#F1F5F9"
                    strokeWidth="10"
                    strokeLinecap="round"
                  />
                  {/* Segment 1: Rose (Videos) */}
                  <path
                    d="M 10 50 A 40 40 0 0 1 35 15"
                    fill="none"
                    stroke="#F43F5E"
                    strokeWidth="10"
                    strokeLinecap="round"
                  />
                  {/* Segment 2: Emerald (Photos) */}
                  <path
                    d="M 35 15 A 40 40 0 0 1 65 15"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="10"
                    strokeLinecap="round"
                  />
                  {/* Segment 3: Amber (Documents) */}
                  <path
                    d="M 65 15 A 40 40 0 0 1 85 35"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth="10"
                    strokeLinecap="round"
                  />
                  {/* Segment 4: Sky Blue (Other Files) */}
                  <path
                    d="M 85 35 A 40 40 0 0 1 90 50"
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="10"
                    strokeLinecap="round"
                  />
                </svg>

                {/* Center Storage Value */}
                <div className="absolute inset-x-0 bottom-1 flex flex-col items-center">
                  <span className="font-black text-xl text-slate-900 tracking-tight">
                    {formatSize(fileStats.totalBytes) || '42.4 MB'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Total Cloud Usage
                  </span>
                </div>
              </div>
            </div>

            {/* STORAGE BREAKDOWN LIST */}
            <div className="space-y-3">
              {/* Videos */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-slate-200/70 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
                    <Film className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 leading-none">Videos</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{fileStats.videosCount} files</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-xs text-slate-700">
                  {formatSize(fileStats.videosSize) || '0 MB'}
                </span>
              </div>

              {/* Photos */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-slate-200/70 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                    <ImageIcon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 leading-none">Photos</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{fileStats.photosCount} files</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-xs text-slate-700">
                  {formatSize(fileStats.photosSize) || '0 MB'}
                </span>
              </div>

              {/* Documents */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-slate-200/70 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 leading-none">Documents</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{fileStats.docsCount} files</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-xs text-slate-700">
                  {formatSize(fileStats.docsSize) || '0 MB'}
                </span>
              </div>

              {/* Other Files */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-slate-200/70 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center">
                    <Archive className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 leading-none">Other Files</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{fileStats.otherCount} files</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-xs text-slate-700">
                  {formatSize(fileStats.otherSize) || '0 MB'}
                </span>
              </div>
            </div>
          </div>

          {/* CLOUD SECURITY / GOOGLE DRIVE BANNER CARD (Bottom Right Card) */}
          <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-white rounded-3xl p-4.5 border border-emerald-200/80 shadow-2xs flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2EA074] to-[#1E7D58] text-white flex items-center justify-center shadow-md shadow-emerald-600/20 mb-2.5">
              <Shield className="w-6 h-6" />
            </div>
            <h4 className="font-black text-xs text-slate-900 leading-snug">Secure Drive Storage</h4>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-relaxed">
              Tersinkronisasi otomatis dengan Google Drive PrepLab Portal
            </p>
            <button
              type="button"
              onClick={() => {
                if (currentFolder) fetchFiles(currentFolder.id);
                toast.success('Data tersinkronisasi');
              }}
              className="mt-3 w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#2EA074] to-[#258f66] hover:from-[#299369] hover:to-[#1e7e59] text-white font-black text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sinkronkan Sekarang</span>
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 5. MODALS (Create Folder & Move File) */}
      {/* ========================================================================= */}

      {/* Modal Buat Folder Baru */}
      {creatingFolder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 bg-white text-slate-900 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-3">
              <FolderPlus className="w-5 h-5" />
            </div>
            <h3 className="font-black text-base text-slate-900 mb-1">Buat Folder Baru</h3>
            <p className="text-xs text-slate-500 mb-4 font-medium">
              Folder akan dibuat di dalam <b>{currentFolder?.name || 'Folder Aktif'}</b>
            </p>
            <input 
              type="text"
              placeholder="Masukkan nama folder..." 
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              className="w-full px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              autoFocus
            />
            <div className="flex gap-2 justify-end mt-6">
              <button
                type="button"
                onClick={() => setCreatingFolder(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button 
                type="button"
                onClick={handleCreateFolder}
                className="px-4 py-2 text-xs font-black bg-[#289E70] hover:bg-[#20845d] text-white rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Buat Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pindahkan File */}
      {movingFile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 bg-white text-slate-900 max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-3">
              <MoveRight className="w-5 h-5" />
            </div>
            <h3 className="font-black text-base text-slate-900 mb-1">Pindahkan File</h3>
            <p className="text-xs text-slate-500 mb-4 truncate font-medium">
              Pilih lokasi tujuan untuk: <b>{movingFile.name}</b>
            </p>
            
            <div className="flex-1 overflow-y-auto min-h-[220px] border border-slate-200 rounded-2xl p-2 space-y-1.5 custom-scrollbar bg-slate-50">
              {folderPath.length > 1 && (
                <div 
                  className="p-3 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-white bg-slate-100/80 transition-colors border border-transparent hover:border-slate-200"
                  onClick={() => handleMoveFile(movingFile.id, folderPath[folderPath.length - 2].id)}
                >
                  <ArrowLeft className="w-4 h-4 text-slate-500" />
                  <span className="font-bold text-xs text-slate-800">Kembali ke folder sebelumnya</span>
                </div>
              )}
              {files.filter(f => f.mimeType?.includes('folder') && f.id !== movingFile.id).map(folder => (
                <div 
                  key={folder.id}
                  className="p-3 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-white bg-white/70 transition-colors border border-slate-200/80"
                  onClick={() => handleMoveFile(movingFile.id, folder.id)}
                >
                  <Folder className="w-4 h-4 fill-emerald-600 text-emerald-600" />
                  <span className="font-bold text-xs text-slate-900">{folder.name}</span>
                </div>
              ))}
              {files.filter(f => f.mimeType?.includes('folder') && f.id !== movingFile.id).length === 0 && folderPath.length <= 1 && (
                <div className="text-center py-10 text-xs text-slate-400 font-medium">
                  Tidak ada folder tujuan lain yang tersedia di sini.
                </div>
              )}
            </div>
            
            <div className="flex gap-2 justify-end mt-5 pt-3 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => setMovingFile(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}