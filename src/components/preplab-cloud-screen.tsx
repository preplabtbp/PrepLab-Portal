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
  isDeveloper?: boolean;
  isManager?: boolean;
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


export function PreplabCloudScreen({ onBack, userProfile, inspectorNik, inspectorName, isDeveloper, isManager }: PreplabCloudScreenProps) {
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
  }, [userProfile, inspectorNik, isDeveloper, isManager]);

  const determineAllowedFolders = () => {
    const cleanNik = (inspectorNik || userProfile?.nik || '').trim().toUpperCase();
    const jab = (userProfile?.jabatan || '').toLowerCase();
    const role = (userProfile?.role || '').toLowerCase();

    // 1. Cek apakah Developer atau Manager
    const isDev = Boolean(
      isDeveloper || 
      userProfile?.isDeveloper || 
      userProfile?.isAdmin ||
      cleanNik === '02D24000043' || 
      cleanNik === '02D25000055' || 
      cleanNik === '04D21001047' || 
      cleanNik === '04D24000042' || 
      cleanNik === 'M0403240177' || 
      cleanNik === '04D25000064' || 
      cleanNik === 'PREPLABADMIN' || 
      cleanNik === 'ADMIN' ||
      cleanNik === 'MEETINGROOM' ||
      cleanNik === 'MEETINGROOMGTS'
    );

    const isMgr = Boolean(
      isManager ||
      jab.includes('manager') ||
      role.includes('manager') ||
      jab.includes('superintendent') ||
      role.includes('superintendent')
    );

    // DEVELOPER & MANAGER: Akses penuh ke seluruh folder tanpa batasan
    if (isDev || isMgr) {
      setAllowedFolders(ALL_FOLDERS);
      return;
    }

    // 2. PERSONIL BIASA: Mengambil langsung dari kolom section di roster/database
    const sec = (userProfile?.section || '').toLowerCase().trim();
    const isGts = userProfile?.pt === 'GTS' || sec.includes('gts');

    const matchedSections = new Set<string>(['ALL']); // General Information selalu diikutsertakan

    if (isGts) {
      matchedSections.add('GTS');
    }
    if (sec.includes('preparation') || sec.includes('preparasi')) {
      matchedSections.add('Preparation');
    }
    if (sec.includes('laboratory') || sec.includes('laboratorium') || sec.includes('lab')) {
      matchedSections.add('Laboratory');
    }
    if (sec.includes('maintenance')) {
      matchedSections.add('Maintenance');
    }
    if (sec.includes('administration') || sec.includes('administrasi')) {
      matchedSections.add('Administration');
    }
    if (sec.includes('inventory')) {
      matchedSections.add('Inventory Control');
    }
    if (sec.includes('quality') || sec.includes('qa')) {
      matchedSections.add('QA');
    }

    const filtered = ALL_FOLDERS.filter(f => matchedSections.has(f.section));
    setAllowedFolders(filtered.length > 0 ? filtered : ALL_FOLDERS.filter(f => f.section === 'ALL'));
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

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-slate-50 text-slate-800 font-sans antialiased">
      {/* ========================================================================= */}
      {/* 1. LEFT SIDEBAR: Section Folders & Actions                                */}
      {/* ========================================================================= */}
      <div className="w-full md:w-64 lg:w-72 bg-white border-b md:border-b-0 md:border-r border-slate-200/90 p-4 sm:p-5 flex flex-col justify-between shrink-0 shadow-2xs">
        <div className="space-y-4">
          {/* Brand & Back Button */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-xs">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-black text-sm text-slate-900 leading-tight">PrepLab Cloud</h1>
                <p className="text-[10px] text-slate-400 font-semibold">File Management Hub</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onBack}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              title="Kembali ke Menu Utama"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                if (!currentFolder) {
                  toast.error('Buka salah satu folder seksi terlebih dahulu');
                  return;
                }
                uploadInputRef.current?.click();
              }}
              disabled={uploading}
              className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span>Upload</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!currentFolder) {
                  toast.error('Buka salah satu folder seksi terlebih dahulu');
                  return;
                }
                setCreatingFolder(true);
              }}
              className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 transition-all cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5 text-slate-500" />
              <span>Folder Baru</span>
            </button>
          </div>

          {/* Hidden file input */}
          <input 
            type="file" 
            ref={uploadInputRef}
            multiple
            className="hidden" 
            onChange={handleUpload}
          />

          {/* Section Folders List */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Folder Seksi</span>
              <span className="text-[10px] font-bold text-slate-400 font-mono">{allowedFolders.length} Seksi</span>
            </div>
            <div className="space-y-1 max-h-[calc(100vh-22rem)] overflow-y-auto custom-scrollbar pr-0.5">
              {allowedFolders.map(folder => {
                const isSelected = currentFolder?.id === folder.id && !showLogs;
                return (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => {
                      setShowLogs(false);
                      openFolder(folder);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 shadow-2xs' 
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Folder className={`w-4 h-4 shrink-0 ${isSelected ? 'text-emerald-600 fill-emerald-600' : 'text-slate-400'}`} />
                      <span className="truncate">{folder.name}</span>
                    </div>
                    {folder.section !== 'ALL' && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">
                        {folder.section}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Footer: Activity Logs & User Profile Info */}
        <div className="pt-3 border-t border-slate-200/80 space-y-2 mt-4">
          <button
            type="button"
            onClick={() => setShowLogs(!showLogs)}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
              showLogs ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" />
              <span>Log Aktivitas Cloud</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <div className="flex items-center gap-2 px-2 py-1 text-slate-500 text-[11px]">
            <User className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span className="truncate font-medium">{inspectorName} ({inspectorNik})</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN WORKSPACE: Direct, High-Efficiency File Explorer                  */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Top Header: Breadcrumbs & Instant Search */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white shrink-0">
          {/* Breadcrumb Path Navigation */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 overflow-x-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => {
                setShowLogs(false);
                setFolderPath([]);
                if (allowedFolders.length === 1) {
                  openFolder(allowedFolders[0]);
                }
              }}
              className="text-slate-500 hover:text-emerald-700 flex items-center gap-1 shrink-0 font-bold cursor-pointer"
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
                    i === folderPath.length - 1 ? 'font-bold text-slate-900' : 'text-slate-600'
                  }`}
                >
                  {f.name}
                </button>
              </React.Fragment>
            ))}
            {folderPath.length === 0 && currentFolder && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                <span className="font-bold text-slate-900 shrink-0">{currentFolder.name}</span>
              </>
            )}
          </div>

          {/* Search Input & Action Icons */}
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64 md:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama file di folder ini..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                if (currentFolder) fetchFiles(currentFolder.id);
                fetchLogs();
                toast.success('Daftar file diperbarui');
              }}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shrink-0"
              title="Refresh Folder"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-6">
          {showLogs ? (
            /* Activity Logs View */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h2 className="text-sm font-black text-slate-900">Riwayat Log Aktivitas Cloud</h2>
                  <p className="text-xs text-slate-500 font-medium">Catatan upload, pemindahan, pembuatan folder, dan penghapusan file</p>
                </div>
                <input
                  type="date"
                  value={logDateFilter}
                  onChange={(e) => setLogDateFilter(e.target.value)}
                  className="py-1 px-2.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white shadow-2xs outline-none"
                />
              </div>

              <div className="space-y-2">
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
                      <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs font-medium">
                        Tidak ada log aktivitas tercatat pada filter ini
                      </div>
                    );
                  }

                  return filteredLogs.map(log => (
                    <div key={log.id} className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
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
              {/* SUBFOLDERS (if any exist) */}
              {(() => {
                const subfolders = filteredFiles.filter(f => f.mimeType?.includes('folder'));
                const foldersToDisplay = folderPath.length === 0 ? allowedFolders : subfolders;
                if (foldersToDisplay.length === 0 && folderPath.length > 0) return null;

                return (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                        {folderPath.length === 0 ? 'Folder Seksi' : 'Subfolder'} ({foldersToDisplay.length})
                      </h2>
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
                          <span>Folder Induk</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {foldersToDisplay.map(f => (
                        <div
                          key={f.id}
                          onClick={() => openFolder(f)}
                          className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-sm transition-all cursor-pointer group flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Folder className="w-5 h-5 text-emerald-600 fill-emerald-600 shrink-0 group-hover:scale-105 transition-transform" />
                            <div className="min-w-0">
                              <span className="font-bold text-xs text-slate-900 group-hover:text-emerald-800 transition-colors block truncate">
                                {f.name}
                              </span>
                              {f.section && (
                                <span className="text-[10px] text-slate-400 block truncate font-medium">
                                  {f.section}
                                </span>
                              )}
                            </div>
                          </div>
                          <FileMenu file={f} onMove={() => setMovingFile(f)} onDelete={() => handleDelete(f)} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* FILES LIST */}
              {(() => {
                const onlyFiles = filteredFiles.filter(f => !f.mimeType?.includes('folder'));

                return (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                        File Dokumen ({onlyFiles.length})
                      </h2>
                    </div>

                    {loading ? (
                      <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-200 text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
                        <p className="text-xs font-medium">Memuat file dari Google Drive...</p>
                      </div>
                    ) : onlyFiles.length === 0 ? (
                      <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200 text-slate-400 p-6">
                        <FolderOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        <p className="font-bold text-xs text-slate-700">Folder ini belum memiliki file</p>
                        <p className="text-[11px] text-slate-400 mt-1">Gunakan tombol "Upload" untuk menambahkan file ke folder ini.</p>
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                        <div className="grid grid-cols-12 gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                          <div className="col-span-7 sm:col-span-6">Nama File</div>
                          <div className="hidden sm:block sm:col-span-3">Tanggal Modifikasi</div>
                          <div className="col-span-3 sm:col-span-2 text-right sm:text-left">Ukuran</div>
                          <div className="col-span-2 sm:col-span-1 text-right">Aksi</div>
                        </div>

                        <div className="divide-y divide-slate-100">
                          {onlyFiles.map(file => {
                            const style = getFileIcon(file.mimeType, file.name);

                            return (
                              <div
                                key={file.id}
                                onClick={() => {
                                  if (file.webViewLink) window.open(file.webViewLink, '_blank');
                                }}
                                className="grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-emerald-50/50 transition-colors cursor-pointer group"
                              >
                                {/* File Name & Icon */}
                                <div className="col-span-7 sm:col-span-6 flex items-center gap-2.5 min-w-0">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${style.bg}`}>
                                    {style.icon}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <ScrollingText text={file.name} className="font-bold text-xs text-slate-900 group-hover:text-emerald-700 transition-colors" />
                                    <span className="text-[10px] text-slate-400 sm:hidden block font-mono">
                                      {formatSize(file.size)}
                                    </span>
                                  </div>
                                </div>

                                {/* Date */}
                                <div className="hidden sm:block sm:col-span-3 text-xs text-slate-500 font-medium">
                                  {file.createdTime 
                                    ? new Date(file.createdTime).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                    : '-'}
                                </div>

                                {/* Size */}
                                <div className="col-span-3 sm:col-span-2 text-right sm:text-left text-xs font-mono font-medium text-slate-600">
                                  {formatSize(file.size) || 'Drive Doc'}
                                </div>

                                {/* Actions */}
                                <div className="col-span-2 sm:col-span-1 flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                  {file.webViewLink && (
                                    <button
                                      type="button"
                                      onClick={() => window.open(file.webViewLink, '_blank')}
                                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-emerald-700 transition-colors cursor-pointer"
                                      title="Buka di Google Drive"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </button>
                                  )}
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
                );
              })()}
            </>
          )}
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