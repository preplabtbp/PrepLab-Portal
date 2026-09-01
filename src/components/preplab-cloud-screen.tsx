import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Input } from './ui';
import { ArrowLeft, Folder, File, Upload, Trash2, Download, Search, History, Cloud, FolderPlus, MoveRight, ExternalLink, MoreVertical } from 'lucide-react';
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

function FileMenu({ file, onMove, onDelete }: { file: any, onMove: () => void, onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const isFolder = file.mimeType?.includes('folder');
  
  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button 
        onClick={() => setOpen(!open)}
        className="p-2 rounded-md transition-colors opacity-70 hover:opacity-100"
        style={{ color: 'var(--text-muted, #64748B)' }}
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div 
            className="absolute right-0 top-full mt-1 w-48 rounded-xl shadow-xl border py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
            style={{ 
              backgroundColor: 'var(--card-bg, #FFFFFF)', 
              borderColor: 'var(--border-main, #E2E8F0)',
              color: 'var(--text-main, #1E293B)' 
            }}
          >
            {!isFolder && (
              <button 
                onClick={() => { setOpen(false); onMove(); }}
                className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:opacity-80 transition-opacity"
                style={{ color: 'var(--text-main, #1E293B)' }}
              >
                <MoveRight className="w-4 h-4" /> Pindahkan
              </button>
            )}
            
            {file.webContentLink && (
              <a 
                href={file.webContentLink}
                target="_blank" 
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:opacity-80 transition-opacity"
                style={{ color: 'var(--text-main, #1E293B)' }}
              >
                <Download className="w-4 h-4" /> Download
              </a>
            )}
            
            {!isFolder && file.webViewLink && (
              <a 
                href={file.webViewLink}
                target="_blank" 
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:opacity-80 transition-opacity"
                style={{ color: 'var(--text-main, #1E293B)' }}
              >
                <ExternalLink className="w-4 h-4" /> Buka di Drive
              </a>
            )}
            
            <button 
              onClick={() => { setOpen(false); onDelete(); }}
              className="w-full text-left px-4 py-2 text-sm text-rose-500 hover:text-rose-600 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Hapus
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
  
  const [logs, setLogs] = useState<any[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [logDateFilter, setLogDateFilter] = useState('');

  useEffect(() => {
    determineAllowedFolders();
    fetchLogs();
  }, [userProfile, inspectorNik]);

  const determineAllowedFolders = () => {
    const cleanNik = (inspectorNik || userProfile?.nik || '').trim().toUpperCase();
    const isSuperNik = 
      cleanNik === '02D24000043' || 
      cleanNik === '02D25000055' || 
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
    if (!e.target.files || e.target.files.length === 0) return;
    if (!currentFolder) return;
    const file = e.target.files[0];
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        
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
        
        if (res.ok) {
          toast.success('File berhasil diupload');
          fetchFiles(currentFolder.id);
        } else {
          toast.error('Gagal mengupload file');
        }
        setUploading(false);
      };
      reader.onerror = () => {
        toast.error('Gagal membaca file');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error('Terjadi kesalahan saat upload');
      setUploading(false);
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
        fetchFiles(currentFolder.id);
      } else {
        toast.error('Gagal menghapus');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan saat hapus');
    }
  };

  const formatSize = (bytes?: string) => {
    if (!bytes) return '';
    const b = parseInt(bytes, 10);
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="w-full h-full min-h-screen bg-transparent flex flex-col pb-24">
      {/* Top Banner / Breadcrumb Bar */}
      <div 
        className="p-4 flex items-center shadow-xs sticky top-0 z-10 border-b backdrop-blur-md transition-colors"
        style={{ 
          backgroundColor: 'var(--header-bg, var(--card-bg, #FFFFFF))',
          borderColor: 'var(--border-main, #E2E8F0)' 
        }}
      >
        <button 
          onClick={() => {
            if (showLogs) setShowLogs(false);
            else if (folderPath.length > 0) {
              const newPath = [...folderPath];
              newPath.pop();
              setFolderPath(newPath);
              if (newPath.length > 0) {
                fetchFiles(newPath[newPath.length - 1].id);
              } else if (allowedFolders.length === 1) {
                onBack();
              }
            }
            else onBack();
          }} 
          className="p-2 mr-3 rounded-full border shadow-xs transition-transform active:scale-95 cursor-pointer"
          style={{ 
            backgroundColor: 'var(--input-bg, #FFFFFF)', 
            borderColor: 'var(--border-main, #E2E8F0)',
            color: 'var(--text-main, #1E293B)' 
          }}
          title="Kembali"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 
            className="font-bold text-lg flex items-center gap-2 font-display"
            style={{ color: 'var(--text-main, #1E293B)' }}
          >
            <Cloud className="w-5 h-5" style={{ color: 'var(--primary, #2A9D8F)' }} />
            {showLogs ? 'Log Aktivitas' : currentFolder ? currentFolder.name : 'PrepLab Cloud'}
          </h2>
          <p className="text-xs line-clamp-1" style={{ color: 'var(--text-muted, #64748B)' }}>
            {showLogs ? 'Riwayat upload & hapus file' : currentFolder ? 'Kelola file di cloud' : 'Akses folder section Anda'}
          </p>
        </div>
        {!showLogs && (
          <button 
            onClick={() => setShowLogs(true)} 
            className="ml-auto p-2 rounded-full border shadow-xs transition-transform active:scale-95 cursor-pointer"
            style={{ 
              backgroundColor: 'var(--input-bg, #FFFFFF)', 
              borderColor: 'var(--border-main, #E2E8F0)',
              color: 'var(--text-main, #1E293B)' 
            }}
            title="Riwayat Log"
          >
            <History className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="p-4 flex-1">
        {showLogs ? (
           <div className="space-y-3">
             <div className="mb-4">
               <input
                 type="date"
                 value={logDateFilter}
                 onChange={(e) => setLogDateFilter(e.target.value)}
                 className="w-full sm:max-w-xs block pl-3 pr-4 py-2 border rounded-xl text-sm font-semibold transition-all outline-none"
                 style={{ 
                   backgroundColor: 'var(--input-bg, #FFFFFF)', 
                   borderColor: 'var(--border-main, #E2E8F0)',
                   color: 'var(--text-main, #1E293B)' 
                 }}
               />
             </div>
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
                   <div 
                     className="text-center p-8 rounded-xl border border-dashed"
                     style={{ 
                       backgroundColor: 'var(--card-bg, #FFFFFF)', 
                       borderColor: 'var(--border-main, #E2E8F0)',
                       color: 'var(--text-muted, #64748B)' 
                     }}
                   >
                     Belum ada riwayat aktivitas
                   </div>
                 );
               }
               
               return filteredLogs.map(log => (
                 <Card key={log.id} className="p-3 flex items-start gap-3">
                    <div 
                      className="p-2 rounded-lg shrink-0 font-bold"
                      style={{ 
                        backgroundColor: 'var(--input-bg, rgba(42,157,143,0.1))',
                        color: 'var(--primary, #2A9D8F)'
                      }}
                    >
                      {log.action === 'Upload' ? <Upload className="w-4 h-4" /> : log.action === 'Create Folder' ? <FolderPlus className="w-4 h-4" /> : log.action === 'Move File' ? <MoveRight className="w-4 h-4" /> : <Trash2 className="w-4 h-4 text-rose-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold" style={{ color: 'var(--text-main, #1E293B)' }}>{log.userName}</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted, #64748B)' }}>
                        {log.action === 'Upload' ? 'Mengupload' : log.action === 'Create Folder' ? 'Membuat folder' : log.action === 'Move File' ? 'Memindahkan' : 'Menghapus'} <span className="font-semibold" style={{ color: 'var(--text-main, #1E293B)' }}>{log.fileName}</span> {log.action === 'Move File' ? 'ke folder' : 'di folder'} <span className="font-semibold" style={{ color: 'var(--text-main, #1E293B)' }}>{log.folderName}</span>
                      </p>
                      <p className="text-[10px] opacity-60 font-mono mt-1" style={{ color: 'var(--text-muted, #64748B)' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                 </Card>
               ));
             })()}
           </div>
        ) : !currentFolder && allowedFolders.length > 1 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {allowedFolders.map(folder => (
              <Card 
                key={folder.id} 
                className="p-5 cursor-pointer hover:shadow-md transition-all flex items-center gap-4 group"
                onClick={() => openFolder(folder)}
              >
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform"
                  style={{ 
                    backgroundColor: 'var(--input-bg, rgba(42,157,143,0.1))', 
                    color: 'var(--primary, #2A9D8F)' 
                  }}
                >
                  <Folder className="w-6 h-6 fill-current" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-base truncate" style={{ color: 'var(--text-main, #1E293B)' }}>
                    {folder.name}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted, #64748B)' }}>
                    Folder Section
                  </p>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {allowedFolders.length === 0 ? (
              <div 
                className="text-center p-8 rounded-xl border border-dashed"
                style={{ 
                  backgroundColor: 'var(--card-bg, #FFFFFF)', 
                  borderColor: 'var(--border-main, #E2E8F0)',
                  color: 'var(--text-muted, #64748B)' 
                }}
              >
                <Folder className="w-12 h-12 opacity-40 mx-auto mb-3" />
                <p>Tidak ada folder yang diizinkan untuk section Anda.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-60" style={{ color: 'var(--text-muted, #64748B)' }} />
                    <input 
                      placeholder="Cari file..." 
                      className="w-full border rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 transition-all text-sm shadow-xs"
                      style={{ 
                        backgroundColor: 'var(--input-bg, #FFFFFF)', 
                        borderColor: 'var(--border-main, #E2E8F0)',
                        color: 'var(--text-main, #1E293B)' 
                      }}
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex gap-2 shrink-0">
                    <input 
                       type="file" 
                       id="cloud-upload" 
                       className="hidden" 
                       onChange={handleUpload}
                    />
                    <Button 
                       variant="secondary"
                       onClick={() => setCreatingFolder(true)}
                       className="gap-2 flex-1 sm:flex-none justify-center py-2.5 shadow-xs font-semibold"
                    >
                      <FolderPlus className="w-4 h-4" />
                      <span>Folder Baru</span>
                    </Button>
                    <Button 
                       onClick={() => document.getElementById('cloud-upload')?.click()}
                       className="gap-2 flex-1 sm:flex-none justify-center py-2.5 shadow-xs text-white font-bold"
                       style={{ backgroundColor: 'var(--primary, #2A9D8F)' }}
                       disabled={uploading}
                    >
                      {uploading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
                      <span>Upload</span>
                    </Button>
                  </div>
                </div>

                {loading ? (
                  <div className="flex justify-center p-12">
                    <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--primary, #2A9D8F)', borderTopColor: 'transparent' }} />
                  </div>
                ) : files.length === 0 ? (
                  <div 
                    className="text-center p-12 rounded-xl border border-dashed"
                    style={{ 
                      backgroundColor: 'var(--card-bg, #FFFFFF)', 
                      borderColor: 'var(--border-main, #E2E8F0)',
                      color: 'var(--text-muted, #64748B)' 
                    }}
                  >
                    <File className="w-12 h-12 opacity-40 mx-auto mb-3" />
                    <p className="font-semibold">Folder masih kosong</p>
                    <p className="text-xs mt-1 opacity-75">Upload file untuk menambahkan</p>
                  </div>
                ) : filteredFiles.length === 0 ? (
                   <div 
                     className="text-center p-8 rounded-xl border"
                     style={{ 
                       backgroundColor: 'var(--card-bg, #FFFFFF)', 
                       borderColor: 'var(--border-main, #E2E8F0)',
                       color: 'var(--text-muted, #64748B)' 
                     }}
                   >
                      Pencarian tidak menemukan hasil
                   </div>
                ) : (
                  <div 
                    className="rounded-xl border overflow-visible shadow-xs divide-y"
                    style={{ 
                      backgroundColor: 'var(--card-bg, #FFFFFF)', 
                      borderColor: 'var(--border-main, #E2E8F0)' 
                    }}
                  >
                    {filteredFiles.map((file) => (
                      <div 
                        key={file.id} 
                        className="p-4 flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
                        style={{ borderColor: 'var(--border-main, #E2E8F0)' }}
                        onClick={(e) => {
                          if (file.mimeType && file.mimeType.includes('folder')) {
                            openFolder(file);
                          } else {
                            const now = Date.now();
                            const lastClick = Number(e.currentTarget.getAttribute('data-last-click') || 0);
                            if (now - lastClick < 400) {
                              if (file.webViewLink) window.open(file.webViewLink, '_blank');
                            }
                            e.currentTarget.setAttribute('data-last-click', now.toString());
                          }
                        }}
                      >
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                          style={{ 
                            backgroundColor: 'var(--input-bg, rgba(42,157,143,0.1))',
                            color: file.mimeType?.includes('folder') ? 'var(--primary, #2A9D8F)' : 'var(--text-muted, #64748B)'
                          }}
                        >
                          {file.mimeType && file.mimeType.includes('folder') ? (
                            <Folder className="w-5 h-5 fill-current" />
                          ) : (
                            <File className="w-5 h-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <ScrollingText text={file.name} className="text-sm font-semibold" />
                          <p className="text-xs" style={{ color: 'var(--text-muted, #64748B)' }}>
                            {new Date(file.createdTime).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})} 
                            {file.size && ` • ${formatSize(file.size)}`}
                          </p>
                        </div>
                        
                        <FileMenu file={file} onMove={() => setMovingFile(file)} onDelete={() => handleDelete(file)} />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      
      {/* Modal Buat Folder Baru */}
      {creatingFolder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div 
            className="rounded-2xl max-w-sm w-full p-5 shadow-2xl border"
            style={{ 
              backgroundColor: 'var(--card-bg, #FFFFFF)', 
              borderColor: 'var(--border-main, #E2E8F0)',
              color: 'var(--text-main, #1E293B)' 
            }}
          >
            <h3 className="font-bold text-lg mb-4 font-display">Buat Folder Baru</h3>
            <Input 
              placeholder="Nama folder..." 
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2 justify-end mt-6">
              <Button variant="secondary" onClick={() => setCreatingFolder(false)}>Batal</Button>
              <Button 
                className="text-white font-bold" 
                style={{ backgroundColor: 'var(--primary, #2A9D8F)' }}
                onClick={handleCreateFolder}
              >
                Buat
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pindahkan File */}
      {movingFile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div 
            className="rounded-2xl max-w-md w-full p-5 shadow-2xl border max-h-[80vh] flex flex-col"
            style={{ 
              backgroundColor: 'var(--card-bg, #FFFFFF)', 
              borderColor: 'var(--border-main, #E2E8F0)',
              color: 'var(--text-main, #1E293B)' 
            }}
          >
            <h3 className="font-bold text-lg mb-1 font-display">Pindahkan File</h3>
            <p className="text-xs mb-4 truncate" style={{ color: 'var(--text-muted, #64748B)' }}>
              Pilih lokasi baru untuk <b>{movingFile.name}</b>
            </p>
            
            <div 
              className="flex-1 overflow-y-auto min-h-[200px] border rounded-xl p-2 space-y-1"
              style={{ 
                backgroundColor: 'var(--input-bg, #FFFFFF)', 
                borderColor: 'var(--border-main, #E2E8F0)' 
              }}
            >
              {folderPath.length > 1 && (
                <div 
                  className="p-3 rounded-lg flex items-center gap-3 cursor-pointer hover:opacity-80"
                  onClick={() => handleMoveFile(movingFile.id, folderPath[folderPath.length - 2].id)}
                >
                  <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text-muted, #64748B)' }} />
                  <span className="font-medium text-sm">Kembali ke folder sebelumnya</span>
                </div>
              )}
              {files.filter(f => f.mimeType?.includes('folder') && f.id !== movingFile.id).map(folder => (
                <div 
                  key={folder.id}
                  className="p-3 rounded-lg flex items-center gap-3 cursor-pointer hover:opacity-80"
                  onClick={() => handleMoveFile(movingFile.id, folder.id)}
                >
                  <Folder className="w-5 h-5 fill-current" style={{ color: 'var(--primary, #2A9D8F)' }} />
                  <span className="font-medium text-sm">{folder.name}</span>
                </div>
              ))}
              {files.filter(f => f.mimeType?.includes('folder') && f.id !== movingFile.id).length === 0 && folderPath.length <= 1 && (
                <div className="text-center p-4 text-xs" style={{ color: 'var(--text-muted, #64748B)' }}>
                  Tidak ada folder tujuan yang tersedia di sini.
                </div>
              )}
            </div>
            
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="secondary" onClick={() => setMovingFile(null)}>Batal</Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}