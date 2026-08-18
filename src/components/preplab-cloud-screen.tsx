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
        className="p-2 text-slate-500 hover:bg-slate-100 rounded-md transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-50">
            {!isFolder && (
              <button 
                onClick={() => { setOpen(false); onMove(); }}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
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
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
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
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" /> Buka di Drive
              </a>
            )}
            
            <button 
              onClick={() => { setOpen(false); onDelete(); }}
              className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2"
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
  }, [userProfile]);

  
  const determineAllowedFolders = () => {
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
    
    if (isSuper || inspectorNik === 'preplabadmin') {
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

  const addLog = async (action: string, fileName: string, folderName: string) => {
    try {
      await fetch('/api/preplab-cloud-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: inspectorNik,
          userName: inspectorName,
          action,
          fileName,
          folderName
        })
      });
      fetchLogs();
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
          addLog('Upload', file.name, currentFolder.name);
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
        addLog('Delete', file.name, currentFolder.name);
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
      <div className="bg-white p-4 flex items-center shadow-sm sticky top-0 z-10">
        <button onClick={() => {
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
        }} className="p-2 mr-3 bg-slate-100 rounded-full text-slate-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-500" />
            {showLogs ? 'Log Aktivitas' : currentFolder ? currentFolder.name : 'PrepLab Cloud'}
          </h2>
          <p className="text-xs text-slate-500 line-clamp-1">
            {showLogs ? 'Riwayat upload & hapus file' : currentFolder ? 'Kelola file di cloud' : 'Akses folder section Anda'}
          </p>
        </div>
        {!showLogs && (
          <button onClick={() => setShowLogs(true)} className="ml-auto p-2 bg-slate-100 text-slate-600 rounded-full">
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
                 className="w-full sm:max-w-xs block pl-3 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all outline-none"
               />
             </div>
             {(() => {
               const filteredLogs = logs.filter(log => {
                 if (!logDateFilter) return true;
                 // Some timestamp might be string or number, parse safely
                 try {
                   const d = new Date(log.timestamp);
                   // adjust to local date
                   const year = d.getFullYear();
                   const month = String(d.getMonth() + 1).padStart(2, '0');
                   const day = String(d.getDate()).padStart(2, '0');
                   return `${year}-${month}-${day}` === logDateFilter;
                 } catch(e) { return true; }
               });
               
               if (filteredLogs.length === 0) {
                 return <div className="text-center p-8 text-slate-500">Belum ada riwayat aktivitas</div>;
               }
               
               return filteredLogs.map(log => (
                 <Card key={log.id} className="p-3 flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${log.action === 'Upload' ? 'bg-emerald-100 text-emerald-600' : log.action === 'Create Folder' ? 'bg-blue-100 text-blue-600' : log.action === 'Move File' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'}`}>
                      {log.action === 'Upload' ? <Upload className="w-4 h-4" /> : log.action === 'Create Folder' ? <FolderPlus className="w-4 h-4" /> : log.action === 'Move File' ? <MoveRight className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{log.userName}</p>
                      <p className="text-xs text-slate-500">
                        {log.action === 'Upload' ? 'Mengupload' : log.action === 'Create Folder' ? 'Membuat folder' : log.action === 'Move File' ? 'Memindahkan' : 'Menghapus'} <span className="font-medium text-slate-700">{log.fileName}</span> {log.action === 'Move File' ? 'ke folder' : 'di folder'} <span className="font-medium">{log.folderName}</span>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">{new Date(log.timestamp).toLocaleString()}</p>
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
                className="p-5 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-4"
                onClick={() => openFolder(folder)}
              >
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                  <Folder className="w-6 h-6 fill-current" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{folder.name}</h3>
                  <p className="text-xs text-slate-500">Folder Section</p>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {allowedFolders.length === 0 ? (
              <div className="text-center p-8 text-slate-500 bg-white rounded-xl border border-dashed">
                <Folder className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p>Tidak ada folder yang diizinkan untuk section Anda.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      placeholder="Cari file..." 
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-700 focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 transition-all text-sm shadow-sm"
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
                       className="gap-2 bg-white flex-1 sm:flex-none justify-center py-2.5 shadow-sm"
                    >
                      <FolderPlus className="w-4 h-4" />
                      <span>Folder Baru</span>
                    </Button>
                    <Button 
                       onClick={() => document.getElementById('cloud-upload')?.click()}
                       className="gap-2 bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none justify-center py-2.5 shadow-sm text-white"
                       disabled={uploading}
                    >
                      {uploading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
                      <span>Upload</span>
                    </Button>
                  </div>
                </div>

                {loading ? (
                  <div className="flex justify-center p-12">
                    <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                  </div>
                ) : files.length === 0 ? (
                  <div className="text-center p-12 text-slate-500 bg-white rounded-xl border border-dashed">
                    <File className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p>Folder masih kosong</p>
                    <p className="text-xs mt-1">Upload file untuk menambahkan</p>
                  </div>
                ) : filteredFiles.length === 0 ? (
                   <div className="text-center p-8 text-slate-500 bg-white rounded-xl">
                      Pencarian tidak menemukan hasil
                   </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-visible">
                    {filteredFiles.map((file, i) => (
                      <div key={file.id} 
  className={`p-4 flex items-center gap-3 first:rounded-t-xl last:rounded-b-xl ${i !== filteredFiles.length - 1 ? 'border-b border-slate-100' : ''} cursor-pointer hover:bg-slate-50`}
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
                        <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center shrink-0">
                          {file.mimeType && file.mimeType.includes('folder') ? (
                            <Folder className="w-5 h-5 text-blue-500 fill-current" />
                          ) : (
                            <File className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <ScrollingText text={file.name} className="text-sm font-medium text-slate-800" />
                          <p className="text-xs text-slate-500">
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
      
      {creatingFolder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-xl">
            <h3 className="font-bold text-lg mb-4">Buat Folder Baru</h3>
            <Input 
              placeholder="Nama folder..." 
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2 justify-end mt-6">
              <Button variant="secondary" onClick={() => setCreatingFolder(false)}>Batal</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleCreateFolder}>Buat</Button>
            </div>
          </div>
        </div>
      )}

      {movingFile && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl max-h-[80vh] flex flex-col">
            <h3 className="font-bold text-lg mb-2">Pindahkan File</h3>
            <p className="text-sm text-slate-500 mb-4 truncate">Pilih lokasi baru untuk <b>{movingFile.name}</b></p>
            
            <div className="flex-1 overflow-y-auto min-h-[200px] border rounded-lg p-2 space-y-1">
              {folderPath.length > 1 && (
                <div 
                  className="p-3 hover:bg-slate-50 rounded-lg flex items-center gap-3 cursor-pointer"
                  onClick={() => handleMoveFile(movingFile.id, folderPath[folderPath.length - 2].id)}
                >
                  <ArrowLeft className="w-5 h-5 text-slate-400" />
                  <span className="font-medium text-slate-700">Kembali ke folder sebelumnya</span>
                </div>
              )}
              {files.filter(f => f.mimeType?.includes('folder') && f.id !== movingFile.id).map(folder => (
                <div 
                  key={folder.id}
                  className="p-3 hover:bg-slate-50 rounded-lg flex items-center gap-3 cursor-pointer"
                  onClick={() => handleMoveFile(movingFile.id, folder.id)}
                >
                  <Folder className="w-5 h-5 text-blue-500 fill-current" />
                  <span className="font-medium text-slate-700">{folder.name}</span>
                </div>
              ))}
              {files.filter(f => f.mimeType?.includes('folder') && f.id !== movingFile.id).length === 0 && folderPath.length <= 1 && (
                <div className="text-center p-4 text-slate-400 text-sm">Tidak ada folder tujuan yang tersedia di sini.</div>
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