import { motion } from 'motion/react';
import React, { useState, useEffect, useMemo } from 'react';
import { Button, Input, Textarea } from './ui';
import { ChevronLeft, Send, X, FileText, User, Paperclip, MessageSquare, Clock, Edit2, Check, ExternalLink, Trash2, Image as ImageIcon, FileSpreadsheet, Download, Maximize2, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { uploadPhotoToDrive } from '../sheets-api';
import { parseCommentAttachments } from './NotionDatabaseTable';

export function BulletinTopicDetail({ 
  post, 
  inspectorName, 
  inspectorNik, 
  onBack,
  departmentName,
  categoryName
}: { 
  post: any, 
  inspectorName: string, 
  inspectorNik: string, 
  onBack: () => void,
  departmentName: string,
  categoryName: string
}) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [selectedFile, setSelectedFile] = useState<{name: string, url: string} | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentData, setCurrentData] = useState({ number: '0', jenisKegiatan: '', keterangan: '', pic: '', status: '', priority: '' });
  const [formData, setFormData] = useState({ number: '0', jenisKegiatan: '', keterangan: '', pic: '', status: '', priority: '' });
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [commentToDelete, setCommentToDelete] = useState<number | null>(null);
  const [showDeleteTopicConfirm, setShowDeleteTopicConfirm] = useState(false);

  const currentUserAvatar = React.useMemo(() => {
    if (inspectorNik) {
      const saved = localStorage.getItem(`p2h_inspector_avatar_${inspectorNik}`);
      if (saved) return saved;
    }
    return null;
  }, [inspectorNik]);

  const getCommentAvatar = (c: any) => {
    if (c.authorAvatar) return c.authorAvatar;
    if (c.authorNik) {
      const local = localStorage.getItem(`p2h_inspector_avatar_${c.authorNik}`);
      if (local) return local;
    }
    if (inspectorNik && String(c.authorNik).trim() === String(inspectorNik).trim() && currentUserAvatar) {
      return currentUserAvatar;
    }
    return null;
  };

  useEffect(() => {
    let parsed = { number: '0', jenisKegiatan: '', keterangan: '', pic: '', status: '', priority: '' };
    try { parsed = JSON.parse(post.content); } catch(e) {}
    setCurrentData(parsed);
    setFormData(parsed);
  }, [post.content]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bulletin/${post.id}/comments`);
      const result = await res.json();
      if (result.status === 'success') {
        setComments(result.data);
      }
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();
  }, [post.id]);

  const deleteComment = async (commentId: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/bulletin/comments/${commentId}?deleterNik=${encodeURIComponent(inspectorNik || '')}&deleterName=${encodeURIComponent(inspectorName || '')}`, {
        method: 'DELETE'
      });
      const result = await res.json();
      if (result.status === 'success') {
        toast.success('Komentar berhasil dihapus');
        setCommentToDelete(null);
        fetchComments();
      } else {
        toast.error('Gagal menghapus: ' + (result.message || 'Error'));
        setLoading(false);
      }
    } catch(e) {
      console.error(e);
      toast.error('Gagal menghapus komentar');
      setLoading(false);
    }
  };

  const deleteTopicPost = async () => {
    try {
      const res = await fetch(`/api/bulletin/${post.id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.status === 'success') {
        toast.success('Topik berhasil dihapus');
        onBack();
      } else {
        toast.error('Gagal menghapus topik');
      }
    } catch (e) {
      toast.error('Gagal menghapus topik');
    }
  };

  const submitComment = async () => {
    if (!newComment.trim() && !selectedFile) return;
    try {
      const res = await fetch(`/api/bulletin/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorNik: inspectorNik,
          authorName: inspectorName,
          content: newComment || (selectedFile ? 'Sent a file' : ''),
          fileName: selectedFile?.name,
          fileUrl: selectedFile?.url
        })
      });
      const result = await res.json();
      if (result.status === 'success') {
        setNewComment('');
        setSelectedFile(null);
        fetchComments();
      }
    } catch(e) {
      toast.error('Gagal mengirim komentar');
    }
  };

  const saveProperties = async () => {
    try {
      const res = await fetch(`/api/bulletin/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: JSON.stringify(formData)
        })
      });
      const result = await res.json();
      if (result.status === 'success') {
        toast.success('Properties updated');
        setCurrentData(formData);
        setIsEditing(false);
      } else {
        toast.error('Gagal update properties');
      }
    } catch(e) {
      toast.error('Gagal update properties');
    }
  };

  const attachments = useMemo(() => {
    const list: any[] = [];
    comments.forEach(c => {
      const parsed = parseCommentAttachments(c.fileUrl, c.fileName);
      parsed.forEach(att => {
        list.push({
          ...att,
          commentId: c.id,
          authorName: c.authorName,
          createdAt: c.createdAt
        });
      });
    });
    return list;
  }, [comments]);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3, ease: "easeOut" }} className="flex flex-col h-full pb-36 w-full w-full max-w-full px-4 md:px-8 md:px-0">
      
      {/* Header / Breadcrumb */}
      <div className="bg-white/90 backdrop-blur-md p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <button 
            onClick={onBack} 
            className="shrink-0 w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-center transition-all text-slate-600 hover:scale-105 active:scale-95"
            title="Kembali ke Daftar Topic"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-0.5">
              <span>Buletin</span>
              <span>/</span>
              <span className="text-blue-600">{departmentName || 'General'}</span>
              {categoryName && (
                <>
                  <span>/</span>
                  <span>{categoryName}</span>
                </>
              )}
            </div>
            <h1 className="text-lg md:text-2xl font-black text-slate-800 tracking-tight uppercase leading-tight truncate">
              {post.title || currentData.jenisKegiatan || 'Topic Detail'}
            </h1>
          </div>
        </div>

        {/* Status Pills & Actions */}
        <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${currentData.status === 'DONE' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : currentData.status === 'PENDING' ? 'bg-slate-100 text-slate-600 border border-slate-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
            {currentData.status || 'ON PROGRESS'}
          </span>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${currentData.priority === 'High' ? 'bg-rose-100 text-rose-700 border border-rose-200' : currentData.priority === 'Medium' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
            {currentData.priority || 'Normal'}
          </span>

          {!showDeleteTopicConfirm ? (
            <button
              onClick={() => setShowDeleteTopicConfirm(true)}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition-all"
              title="Hapus Topik Ini"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 p-1 rounded-xl animate-in fade-in duration-150">
              <span className="text-[11px] font-bold text-rose-700 px-1">Hapus Topik?</span>
              <button onClick={deleteTopicPost} className="px-2 py-0.5 bg-rose-600 text-white rounded text-[11px] font-bold hover:bg-rose-700">Ya</button>
              <button onClick={() => setShowDeleteTopicConfirm(false)} className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-[11px] font-bold hover:bg-slate-300">Batal</button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
         {/* Left Side: Topic Info / Notion Content */}
         <div className="lg:col-span-4 space-y-4">
            {post.notionId ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6">
                <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-4">Notion Document</h3>
                {post.coverImage && (
                  <img src={post.coverImage} alt="Cover" className="w-full h-32 object-cover rounded-lg mb-4" />
                )}
                <div className="prose prose-sm max-w-none prose-slate">
                  {/* Since we don't have a markdown renderer, we just pre-wrap it for now. In a real app, use react-markdown here */}
                  <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">{post.content}</pre>
                </div>
                {post.tags && post.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {post.tags.map((tag: string, i: number) => (
                      <span key={i} className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-md">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
            <>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6">
               <div className="flex justify-between items-center mb-5">
                 <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Properties</h3>
                 {!isEditing ? (
                   <button onClick={() => setIsEditing(true)} className="text-slate-400 hover:text-blue-600 transition-colors p-1" title="Edit Properties">
                     <Edit2 className="w-4 h-4" />
                   </button>
                 ) : (
                   <div className="flex gap-2">
                     <button onClick={() => {setIsEditing(false); setFormData(currentData);}} className="text-slate-400 hover:text-slate-600 transition-colors p-1 bg-slate-100 rounded">
                       <X className="w-4 h-4" />
                     </button>
                     <button onClick={saveProperties} className="text-white bg-blue-600 hover:bg-blue-700 transition-colors p-1 rounded">
                       <Check className="w-4 h-4" />
                     </button>
                   </div>
                 )}
               </div>
               
               <div className="space-y-5">
                  <div>
                    <label className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 flex items-center gap-1.5 mb-1.5"><User className="w-3.5 h-3.5"/> PIC</label>
                    {isEditing ? (
                      <input value={formData.pic} onChange={e => setFormData({...formData, pic: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-blue-500" />
                    ) : (
                      <p className="text-sm font-medium text-slate-800">{currentData.pic || '-'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 flex items-center gap-1.5 mb-1.5"><FileText className="w-3.5 h-3.5"/> Keterangan</label>
                    {isEditing ? (
                      <textarea value={formData.keterangan} onChange={e => setFormData({...formData, keterangan: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-blue-500 min-h-[80px]" />
                    ) : (
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{currentData.keterangan || '-'}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 flex items-center gap-1.5 mb-1.5">Status</label>
                    {isEditing ? (
                      <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-blue-500">
                        <option value="PENDING">PENDING</option>
                        <option value="ON PROGRESS">ON PROGRESS</option>
                        <option value="DONE">DONE</option>
                      </select>
                    ) : (
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${currentData.status === 'DONE' ? 'bg-emerald-100 text-emerald-700' : currentData.status === 'PENDING' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700'}`}>
                         {currentData.status || 'ON PROGRESS'}
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 flex items-center gap-1.5 mb-1.5">Priority</label>
                    {isEditing ? (
                      <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-blue-500">
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    ) : (
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide ${currentData.priority === 'High' ? 'bg-rose-100 text-rose-700' : currentData.priority === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                         {currentData.priority || 'Normal'}
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 flex items-center gap-1.5 mb-1.5"><Clock className="w-3.5 h-3.5"/> Waktu Dibuat</label>
                    <p className="text-sm font-medium text-slate-800">{new Date(post.createdAt).toLocaleString()}</p>
                  </div>
               </div>
            </div>

            {/* Tabel Attachment Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs uppercase font-bold text-slate-500 tracking-wider flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-blue-600" /> Tabel Attachment
                </h3>
                <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-100">
                  {attachments.length} File
                </span>
              </div>

              {attachments.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-slate-400">
                  <Paperclip className="w-6 h-6 mx-auto mb-1 opacity-50" />
                  <p className="text-xs font-medium">Belum ada attachment pada topik ini</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs text-left text-slate-600">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5 text-center">#</th>
                        <th className="px-3 py-2.5">Nama File</th>
                        <th className="px-3 py-2.5">Pengirim</th>
                        <th className="px-3 py-2.5 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {attachments.map((att, idx) => (
                        <tr key={att.id || idx} className="hover:bg-blue-50/40 transition-colors">
                          <td className="px-3 py-2 text-center font-semibold text-slate-400">{idx + 1}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2 min-w-[140px]">
                              <div className="w-7 h-7 rounded bg-blue-100/80 text-blue-600 flex items-center justify-center shrink-0">
                                {att.isImage ? <ImageIcon className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                              </div>
                              <span className="font-semibold text-slate-800 truncate max-w-[150px]" title={att.name}>{att.name || 'Attachment'}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-slate-500 font-medium">{att.authorName || '-'}</td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            <button
                              onClick={() => att.isImage ? setPreviewImage(att.directUrl || att.url) : window.open(att.driveViewUrl || att.url, '_blank', 'noopener,noreferrer')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-blue-600 hover:text-white border border-slate-200 hover:border-blue-600 rounded-lg text-[11px] font-semibold text-slate-700 transition-all shadow-2xs"
                            >
                              <ExternalLink className="w-3 h-3" /> Buka
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            </>
            )}
         </div>

         {/* Right Side: Comments / Discussion */}
         <div className="lg:col-span-8 flex flex-col h-[calc(100vh-280px)] min-h-[500px] mb-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
               <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                 <MessageSquare className="w-4 h-4 text-blue-600" />
                 <h2 className="font-semibold text-slate-800 text-sm">Comments & Updates</h2>
               </div>
               
               <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-6 bg-slate-50/30">
                 {loading ? (
                   <div className="flex items-center justify-center h-full">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                   </div>
                 ) : comments.length === 0 ? (
                   <div className="flex flex-col items-center justify-center h-full text-slate-400">
                     <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                       <MessageSquare className="w-8 h-8 text-slate-300" />
                     </div>
                     <p className="text-sm font-medium">Belum ada komentar.</p>
                     <p className="text-xs mt-1">Jadilah yang pertama membagikan update!</p>
                   </div>
                 ) : (
                   comments.map(c => {
                     const isOwn = Boolean(
                       (c.authorNik && inspectorNik && String(c.authorNik).trim().toLowerCase() === String(inspectorNik).trim().toLowerCase()) ||
                       (c.authorName && inspectorName && String(c.authorName).trim().toLowerCase() === String(inspectorName).trim().toLowerCase()) ||
                       (!c.authorNik && !c.authorName && !c.authorAvatar)
                     );
                     
                     const canDelete = Boolean(
                       isOwn || 
                       inspectorNik === 'preplabadmin' || 
                       inspectorNik === '02D25000055'
                     );
                     
                     return (
                     <div key={c.id} className={`flex gap-3.5 group ${isOwn ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold shadow-sm overflow-hidden border ${isOwn ? 'border-teal-200 bg-teal-100 text-teal-700' : 'border-blue-200 bg-blue-100 text-blue-700'}`}>
                          {getCommentAvatar(c) ? (
                            <img src={getCommentAvatar(c)!} alt={c.authorName || 'Avatar'} className="w-full h-full object-cover" />
                          ) : (
                            <span>{c.authorName ? c.authorName.charAt(0).toUpperCase() : '?'}</span>
                          )}
                        </div>
                        <div className={`flex-1 space-y-1.5 ${isOwn ? 'flex flex-col items-end' : ''}`}>
                           <div className={`flex justify-between items-center w-full gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                             <span className="font-semibold text-xs text-slate-800">{isOwn ? 'Anda' : c.authorName}</span>
                             
                             <div className={`flex items-center gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                               <span className="text-[10px] font-medium text-slate-400">{c.createdAt ? format(new Date(c.createdAt), 'dd MMM yyyy, HH:mm') : ''}</span>
                               
                               {/* Delete Comment Button */}
                               {canDelete && (
                                 commentToDelete === c.id ? (
                                   <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg animate-in fade-in duration-150">
                                     <span className="text-[10px] font-bold text-rose-600">Hapus?</span>
                                     <button onClick={() => deleteComment(c.id)} className="text-[10px] font-bold text-rose-700 hover:underline px-1">Ya</button>
                                     <button onClick={() => setCommentToDelete(null)} className="text-[10px] font-bold text-slate-500 hover:underline px-1">Batal</button>
                                   </div>
                                 ) : (
                                   <button 
                                     onClick={() => setCommentToDelete(c.id)} 
                                     className="text-slate-300 hover:text-rose-600 transition-colors p-1 rounded-md hover:bg-rose-50" 
                                     title="Hapus Komentar Ini"
                                   >
                                     <Trash2 className="w-3.5 h-3.5" />
                                   </button>
                                 )
                               )}
                             </div>
                           </div>
                           
                            <div className={`border shadow-2xs rounded-2xl p-3.5 inline-block min-w-[20%] max-w-[85%] ${isOwn ? 'bg-teal-50/90 border-teal-200/80 rounded-tr-none text-right' : 'bg-white border-slate-200 rounded-tl-none'}`}>
                              {c.content && <p className={`text-sm text-slate-700 whitespace-pre-wrap leading-relaxed ${isOwn ? 'text-right' : 'text-left'}`}>{c.content}</p>}
                              
                              {/* Attachments rendering */}
                              {(() => {
                                const attachments = parseCommentAttachments(c.fileUrl, c.fileName);
                                const imageAttachments = attachments.filter(a => a.isImage);
                                const docAttachments = attachments.filter(a => !a.isImage);

                                if (attachments.length === 0) return null;

                                return (
                                  <div className={`mt-2.5 space-y-2 ${c.content ? (isOwn ? 'pt-2.5 border-t border-teal-200/60' : 'pt-2.5 border-t border-slate-100') : ''} ${isOwn ? 'flex flex-col items-end' : ''}`}>
                                    {/* Images */}
                                    {imageAttachments.length > 0 && (
                                      <div className={`flex flex-wrap gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                        {imageAttachments.map((att, idx) => (
                                          <div 
                                            key={idx}
                                            className="relative cursor-zoom-in rounded-xl overflow-hidden border border-slate-200 bg-slate-100 inline-block group/img shadow-sm max-w-[260px]"
                                            onClick={() => setPreviewImage(att.directUrl || att.url)}
                                            title={`Klik untuk memperbesar: ${att.name}`}
                                          >
                                            <div className="w-full h-44 bg-slate-100 flex items-center justify-center overflow-hidden">
                                              <img
                                                src={att.directUrl || att.url}
                                                alt={att.name}
                                                loading="lazy"
                                                referrerPolicy="no-referrer"
                                                className="w-full h-full object-cover transition-transform group-hover/img:scale-105"
                                                onError={(e) => {
                                                  const target = e.target as HTMLImageElement;
                                                  if (att.id && !target.src.includes('googleusercontent.com')) {
                                                    target.src = `https://lh3.googleusercontent.com/d/${att.id}`;
                                                  } else if (att.id && !target.src.includes('thumbnail')) {
                                                    target.src = `https://drive.google.com/thumbnail?id=${att.id}&sz=w1000`;
                                                  }
                                                }}
                                              />
                                            </div>
                                            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/25 transition-colors flex items-center justify-center">
                                              <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover/img:opacity-100 drop-shadow-md" />
                                            </div>
                                            <div className="px-2 py-1.5 bg-white/95 border-t border-slate-100 flex items-center justify-between gap-1.5 text-[10px] text-slate-600 font-medium truncate">
                                              <div className="flex items-center gap-1.5 truncate">
                                                <ImageIcon className="w-3 h-3 text-blue-500 shrink-0" />
                                                <span className="truncate">{att.name}</span>
                                              </div>
                                              {att.driveViewUrl && (
                                                <a 
                                                  href={att.driveViewUrl} 
                                                  target="_blank" 
                                                  rel="noreferrer"
                                                  onClick={(e) => e.stopPropagation()}
                                                  className="text-blue-500 hover:text-blue-700 hover:underline shrink-0 flex items-center gap-0.5 ml-1"
                                                  title="Buka di Google Drive"
                                                >
                                                  <ExternalLink className="w-2.5 h-2.5" />
                                                </a>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Documents */}
                                    {docAttachments.length > 0 && (
                                      <div className={`flex flex-wrap gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                                        {docAttachments.map((att, idx) => {
                                          const lowerName = att.name.toLowerCase();
                                          const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv');
                                          const isPdf = lowerName.endsWith('.pdf');

                                          return (
                                            <div
                                              key={idx}
                                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl text-xs font-semibold text-slate-700 transition-all shadow-2xs"
                                            >
                                              <div className={`p-1 rounded-md ${isExcel ? 'bg-emerald-100 text-emerald-700' : isPdf ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {isExcel ? <FileSpreadsheet className="w-3.5 h-3.5" /> : isPdf ? <FileText className="w-3.5 h-3.5" /> : <FileDown className="w-3.5 h-3.5" />}
                                              </div>
                                              <div className="min-w-0 pr-1 text-left">
                                                <span className="truncate block max-w-[160px]" title={att.name}>{att.name}</span>
                                                {att.size && <span className="text-[9px] text-slate-400 font-mono">{(att.size / 1024).toFixed(0)} KB</span>}
                                              </div>
                                              <div className="flex items-center gap-1 shrink-0 pl-1 border-l border-slate-200">
                                                {att.driveViewUrl && (
                                                  <a
                                                    href={att.driveViewUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                                                    title="Buka di Drive"
                                                  >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                  </a>
                                                )}
                                                {att.driveDownloadUrl && (
                                                  <a
                                                    href={att.driveDownloadUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                                                    title="Download"
                                                  >
                                                    <Download className="w-3.5 h-3.5" />
                                                  </a>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                         </div>
                      </div>
                    )})
                  )}
                </div>

                {/* Chat Input Area (padded at bottom to prevent footer occlusion) */}
                <div className="p-4 pb-20 md:pb-6 bg-white border-t border-slate-200">
                   {selectedFile && (
                     <div className="mb-3 flex items-center">
                       <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-xl text-xs flex items-center gap-2.5 border border-blue-200 shadow-2xs">
                          <Paperclip className="w-3.5 h-3.5 text-blue-500" />
                          <span className="font-semibold truncate max-w-[200px]">{selectedFile.name}</span>
                          <button onClick={() => setSelectedFile(null)} className="p-1 hover:bg-blue-100 rounded-md transition-colors text-blue-500 hover:text-blue-700">
                            <X className="w-3.5 h-3.5" />
                          </button>
                       </div>
                     </div>
                   )}
                   <div className="flex items-end gap-3">
                     <div className="w-9 h-9 rounded-full overflow-hidden bg-teal-100 border border-teal-200 flex-shrink-0 flex items-center justify-center font-bold text-teal-700 text-xs shadow-2xs mb-1">
                       {currentUserAvatar ? (
                         <img src={currentUserAvatar} alt={inspectorName || 'Profile'} className="w-full h-full object-cover" />
                       ) : (
                         <span>{inspectorName ? inspectorName.charAt(0).toUpperCase() : '?'}</span>
                       )}
                     </div>
                     <div className="flex-1 flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all shadow-2xs">
                       <label className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors shrink-0 cursor-pointer" title="Lampirkan File">
                         <Paperclip className="w-5 h-5" />
                         <input type="file" className="hidden" onChange={(e) => {
                           const file = e.target.files?.[0];
                           if (file) {
                             toast.loading('Uploading file...', { id: 'upload' });
                             const reader = new FileReader();
                             reader.onload = async (ev) => {
                                try {
                                  const base64 = ev.target?.result as string;
                                  const base64Data = base64.split(',')[1];
                                  const url = await uploadPhotoToDrive(base64Data, file.type, file.name, 'Bulletin Board');
                                  setSelectedFile({ name: file.name, url });
                                  toast.success('Upload selesai', { id: 'upload' });
                                } catch (err) {
                                  console.error(err);
                                  toast.error('Upload gagal', { id: 'upload' });
                                }
                             };
                             reader.readAsDataURL(file);
                           }
                         }} />
                       </label>
                       
                       <textarea 
                         placeholder="Tulis update atau pesan... (Enter untuk kirim)" 
                         className="w-full bg-transparent border-none focus:ring-0 text-sm py-2 px-1 resize-none min-h-[40px] max-h-[120px] text-slate-700 placeholder:text-slate-400"
                         value={newComment}
                         rows={newComment.split('\n').length > 1 ? Math.min(newComment.split('\n').length, 4) : 1}
                         onChange={e => setNewComment(e.target.value)}
                         onKeyDown={e => {
                           if (e.key === 'Enter' && !e.shiftKey) {
                             e.preventDefault();
                             submitComment();
                           }
                         }}
                       />
                       
                       <button 
                         onClick={submitComment} 
                         disabled={!newComment.trim() && !selectedFile}
                         className="shrink-0 p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl shadow-2xs transition-all flex items-center justify-center mb-0.5"
                         title="Kirim Komentar"
                       >
                         <Send className="w-4 h-4 ml-0.5" />
                       </button>
                     </div>
                  </div>
                </div>
             </div>
          </div>
       </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={(() => {
                const match = previewImage.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                              previewImage.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
                              previewImage.match(/\/view\/([a-zA-Z0-9_-]+)/) ||
                              previewImage.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                if (match) {
                  return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w2000`;
                }
                return previewImage;
              })()} 
              alt="Preview" 
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[80vh] rounded-xl shadow-2xl object-contain" 
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                const match = previewImage.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                              previewImage.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
                              previewImage.match(/\/view\/([a-zA-Z0-9_-]+)/) ||
                              previewImage.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                if (match && !target.src.includes('googleusercontent.com')) {
                  target.src = `https://lh3.googleusercontent.com/d/${match[1]}`;
                } else if (match && !target.src.includes('/api/drive/view/')) {
                  target.src = `/api/drive/view/${match[1]}`;
                }
              }}
            />
            <div className="mt-3 flex items-center gap-3">
              <a
                href={previewImage}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold backdrop-blur-md border border-white/20 flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Buka Tab Baru
              </a>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
