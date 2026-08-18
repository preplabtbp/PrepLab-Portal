import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select, Textarea } from './ui';
import { motion } from 'motion/react';
import { Search, Paperclip, MessageSquare, ChevronLeft, Plus, Trash2, Clock, CheckCircle2, User, Send, Building2, Home, ChevronRight, FileText, Settings, AlignLeft, Edit2, Check, X, Plane, TestTube2, AlertCircle, FileSpreadsheet, ShieldAlert, BadgeInfo, File, FolderOpen, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { BulletinTopicDetail } from './bulletin-topic-detail';

const AVAILABLE_ICONS = {
  Building2: Building2,
  FileText: FileText,
  Plane: Plane,
  TestTube2: TestTube2,
  AlertCircle: AlertCircle,
  FileSpreadsheet: FileSpreadsheet,
  ShieldAlert: ShieldAlert,
  BadgeInfo: BadgeInfo,
  File: File,
  FolderOpen: FolderOpen,
  Calendar: Calendar,
  CheckCircle2: CheckCircle2
};

const getInitialCategories = (department: string, type: 'INFO' | 'RULES') => {
  const dept = (department || '').toLowerCase();
  
  if (type === 'INFO') {
    if (dept.includes('prep & lab') || dept.includes('preparation & laboratory')) {
      return [
        { id: '1', name: 'Non Routine Laboratorium', icon: 'Building2' },
        { id: '2', name: 'Routine Laboratorium (Tentative)', icon: 'Building2' },
        { id: '3', name: 'Weekly Laboratorium', icon: 'Building2' },
        { id: '4', name: 'Monthly Laboratorium', icon: 'Building2' },
        { id: '5', name: 'Quarterly Laboratorium', icon: 'Building2' },
        { id: '6', name: 'Yearly Laboratorium', icon: 'Building2' },
        { id: '7', name: 'Biannual Laboratorium', icon: 'Building2' }
      ];
    } else if (dept.includes('preparation')) {
      return [
        { id: 'prep_info_1', name: 'Maintenance Crusher & Pulverizer', icon: 'Settings' },
        { id: 'prep_info_2', name: 'Serah Terima Sampel Preparation', icon: 'FolderOpen' },
        { id: 'prep_info_3', name: 'Log Harian Suhu Oven Pengeringan', icon: 'Calendar' },
        { id: 'prep_info_4', name: 'Pembersihan Area Crusher & Splitting', icon: 'CheckCircle2' },
        { id: 'prep_info_5', name: 'Kalibrasi Timbangan Preparation', icon: 'FileSpreadsheet' }
      ];
    } else if (dept.includes('laboratory') || dept.includes('lab')) {
      return [
        { id: 'lab_info_1', name: 'Kalibrasi Alat AAS & XRF', icon: 'TestTube2' },
        { id: 'lab_info_2', name: 'Stok Reagen & Bahan Kimia Cair', icon: 'FileSpreadsheet' },
        { id: 'lab_info_3', name: 'Logbook Pembuangan Limbah B3', icon: 'AlertCircle' },
        { id: 'lab_info_4', name: 'Jadwal Pembersihan Fume Hood', icon: 'Calendar' },
        { id: 'lab_info_5', name: 'Analisis Duplikat & Standar QC', icon: 'FileText' }
      ];
    } else if (dept.includes('maintenance')) {
      return [
        { id: 'maint_info_1', name: 'Jadwal Preventive Maintenance (PM)', icon: 'Calendar' },
        { id: 'maint_info_2', name: 'Log Request Perbaikan Alat', icon: 'AlertCircle' },
        { id: 'maint_info_3', name: 'Stok Sparepart Kritis Lab', icon: 'FileSpreadsheet' },
        { id: 'maint_info_4', name: 'Kalibrasi Suhu Muffle Furnace', icon: 'Settings' },
        { id: 'maint_info_5', name: 'Inspeksi Sistem Kompresor & Gas Lab', icon: 'CheckCircle2' }
      ];
    } else if (dept.includes('assurance') || dept.includes('qa') || dept.includes('quality')) {
      return [
        { id: 'qa_info_1', name: 'Jadwal Internal Audit ISO 17025', icon: 'Calendar' },
        { id: 'qa_info_2', name: 'Rekap Deviasi Nilai CRM', icon: 'FileSpreadsheet' },
        { id: 'qa_info_3', name: 'Verifikasi Metode Analisis Baru', icon: 'FileText' },
        { id: 'qa_info_4', name: 'Agenda Management Review QA', icon: 'FolderOpen' },
        { id: 'qa_info_5', name: 'Hasil Uji Profisiensi (Interlab Test)', icon: 'TestTube2' }
      ];
    } else if (dept.includes('administration') || dept.includes('admin')) {
      return [
        { id: 'admin_info_1', name: 'Informasi Roster & Cuti Karyawan', icon: 'Calendar' },
        { id: 'admin_info_2', name: 'Pelaporan Makanan & Konsumsi Mess', icon: 'FileSpreadsheet' },
        { id: 'admin_info_3', name: 'Log Pengajuan Surat Izin & SAK', icon: 'FileText' },
        { id: 'admin_info_4', name: 'Update Jadwal Transportasi / Travel', icon: 'Plane' },
        { id: 'admin_info_5', name: 'Pengadaan ATK & Kertas Logbook', icon: 'FolderOpen' }
      ];
    }
    return [
      { id: '1', name: 'Informasi Umum', icon: 'Building2' },
      { id: '2', name: 'Agenda Kegiatan', icon: 'Calendar' },
      { id: '3', name: 'Pemberitahuan Internal', icon: 'BadgeInfo' }
    ];
  } else {
    if (dept.includes('prep & lab') || dept.includes('preparation & laboratory')) {
      return [
        { id: 'r1', name: 'Kedatangan Visitor/Vendor', icon: 'Plane' },
        { id: 'r2', name: 'Sampel Check Assay (CA)', icon: 'TestTube2' },
        { id: 'r3', name: 'Pengiriman TLD Badge ke BRIN', icon: 'FileText' },
        { id: 'r4', name: 'Pengiriman TLD Badge ke Gamaxindo', icon: 'FileText' },
        { id: 'r5', name: 'Pengiriman Surveymeter & Pendose', icon: 'AlertCircle' },
        { id: 'r6', name: 'Penghapusan data Asset', icon: 'FileSpreadsheet' },
        { id: 'r7', name: 'Information Laboratorium', icon: 'BadgeInfo' }
      ];
    } else if (dept.includes('preparation')) {
      return [
        { id: 'prep_rules_1', name: 'SOP Penggunaan Dust Collector', icon: 'ShieldAlert' },
        { id: 'prep_rules_2', name: 'APD Wajib Crusher (Masker Respirator)', icon: 'ShieldAlert' },
        { id: 'prep_rules_3', name: 'Prosedur Penanganan Sampel Basah', icon: 'FileText' },
        { id: 'prep_rules_4', name: 'Kebersihan Crusher / Pulverizer setelah dipakai', icon: 'CheckCircle2' }
      ];
    } else if (dept.includes('laboratory') || dept.includes('lab')) {
      return [
        { id: 'lab_rules_1', name: 'SOP Penggunaan Fume Hood', icon: 'ShieldAlert' },
        { id: 'lab_rules_2', name: 'Penanganan Tumpahan Bahan Kimia B3', icon: 'ShieldAlert' },
        { id: 'lab_rules_3', name: 'Penggunaan APD Lab Lengkap', icon: 'ShieldAlert' },
        { id: 'lab_rules_4', name: 'MSDS Checklist Bahan Kimia', icon: 'FileText' }
      ];
    } else if (dept.includes('maintenance')) {
      return [
        { id: 'maint_rules_1', name: 'Prosedur LOTO (Lockout Tagout)', icon: 'ShieldAlert' },
        { id: 'maint_rules_2', name: 'Kesiapan APAR Area Workshop', icon: 'ShieldAlert' },
        { id: 'maint_rules_3', name: 'Aturan Hot Work Permit', icon: 'FileText' },
        { id: 'maint_rules_4', name: 'Kebersihan Bengkel Kerja Maintenance', icon: 'CheckCircle2' }
      ];
    } else if (dept.includes('assurance') || dept.includes('qa') || dept.includes('quality')) {
      return [
        { id: 'qa_rules_1', name: 'Prosedur Pengendalian Dokumen & Form', icon: 'FileText' },
        { id: 'qa_rules_2', name: 'Aturan Penggunaan CRM Sekunder', icon: 'ShieldAlert' },
        { id: 'qa_rules_3', name: 'Penanganan Sampel OOS (Out of Spec)', icon: 'AlertCircle' },
        { id: 'qa_rules_4', name: 'Kebijakan Integritas Data Hasil Uji', icon: 'ShieldAlert' }
      ];
    } else if (dept.includes('administration') || dept.includes('admin')) {
      return [
        { id: 'admin_rules_1', name: 'Aturan Pengajuan Cuti (H-14)', icon: 'FileText' },
        { id: 'admin_rules_2', name: 'Prosedur Pelaporan Sakit & SAK', icon: 'FileText' },
        { id: 'admin_rules_3', name: 'Protokol Check-in / Check-out Mess', icon: 'ShieldAlert' },
        { id: 'admin_rules_4', name: 'Kebijakan Pengarsipan Dokumen Fisik', icon: 'FolderOpen' }
      ];
    }
    return [
      { id: 'r1', name: 'Aturan & Tata Tertib Kerja', icon: 'ShieldAlert' },
      { id: 'r2', name: 'Penggunaan APD Wajib', icon: 'ShieldAlert' },
      { id: 'r3', name: 'Pelaporan Insiden / Hazard', icon: 'AlertCircle' }
    ];
  }
};

const migrateData = (data: any[], defaultData: any[]) => {
  if (!data || !Array.isArray(data)) return defaultData;
  return data.map((item, idx) => {
    if (typeof item === 'string') {
      return { id: Math.random().toString(36).substring(7), name: item, icon: 'FileText' };
    }
    return item;
  });
};

export function BulletinBoard({ inspectorName, inspectorNik, departmentName }: { inspectorName: string, inspectorNik: string, departmentName: string }) {
  const [viewMode, setViewMode] = useState<'menu' | 'detail' | 'topic'>('menu');
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<{id: string, name: string, type: 'INFO' | 'RULES', icon: string} | null>(null);
  
  const [infoCategories, setInfoCategories] = useState<any[]>(() => {
    const saved = localStorage.getItem(`bulletin_info_${departmentName}`);
    const initial = getInitialCategories(departmentName, 'INFO');
    return saved ? migrateData(JSON.parse(saved), initial) : initial;
  });
  const [rulesCategories, setRulesCategories] = useState<any[]>(() => {
    const saved = localStorage.getItem(`bulletin_rules_${departmentName}`);
    const initial = getInitialCategories(departmentName, 'RULES');
    return saved ? migrateData(JSON.parse(saved), initial) : initial;
  });

  useEffect(() => {
    const savedInfo = localStorage.getItem(`bulletin_info_${departmentName}`);
    const initialInfo = getInitialCategories(departmentName, 'INFO');
    setInfoCategories(savedInfo ? migrateData(JSON.parse(savedInfo), initialInfo) : initialInfo);

    const savedRules = localStorage.getItem(`bulletin_rules_${departmentName}`);
    const initialRules = getInitialCategories(departmentName, 'RULES');
    setRulesCategories(savedRules ? migrateData(JSON.parse(savedRules), initialRules) : initialRules);
    
    setViewMode('menu');
    setSelectedCategory(null);
    setSelectedPost(null);
  }, [departmentName]);

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setShowSearchResults(false);
      return;
    }
    setIsSearching(true);
    setShowSearchResults(true);
    try {
      const res = await fetch(`/api/bulletin/search?q=${encodeURIComponent(searchQuery)}&department=${encodeURIComponent(departmentName)}`);
      const data = await res.json();
      if (data.status === 'success') {
        setSearchResults(data.data);
      }
    } catch(err) {
      toast.error('Gagal mencari data');
    }
    setIsSearching(false);
  };
  const [employees, setEmployees] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/employees')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setEmployees(data);
      })
      .catch(console.error);
  }, []);
  
  const [showAddCategory, setShowAddCategory] = useState<'INFO' | 'RULES' | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('FileText');

  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryIcon, setEditCategoryIcon] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
     number: '0',
     jenisKegiatan: '',
     keterangan: '',
     pic: '',
     status: 'ON PROGRESS',
     priority: '',
     agendaDate: ''
  });

  useEffect(() => {
    localStorage.setItem(`bulletin_info_${departmentName}`, JSON.stringify(infoCategories));
  }, [infoCategories, departmentName]);

  useEffect(() => {
    localStorage.setItem(`bulletin_rules_${departmentName}`, JSON.stringify(rulesCategories));
  }, [rulesCategories, departmentName]);

  const fetchPosts = async () => {
    if (!selectedCategory) return;
    setLoading(true);
    try {
      const res = await fetch('/api/bulletin');
      const data = await res.json();
      if (data.status === 'success') { 
         setPosts(data.data);
      }
    } catch(e) {
      toast.error('Gagal memuat data');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (viewMode === 'detail') {
      fetchPosts();
    }
  }, [viewMode, selectedCategory]);

  const handleAddCategory = (type: 'INFO' | 'RULES') => {
     if (!newCategoryName.trim()) return;
     const newItem = { id: Math.random().toString(36).substring(7), name: newCategoryName, icon: newCategoryIcon };
     if (type === 'INFO') {
       setInfoCategories([...infoCategories, newItem]);
     } else {
       setRulesCategories([...rulesCategories, newItem]);
     }
     setNewCategoryName('');
     setNewCategoryIcon('FileText');
     setShowAddCategory(null);
     toast.success('List ditambahkan');
  };

  const handleSaveEditCategory = (type: 'INFO' | 'RULES', id: string) => {
    if (!editCategoryName.trim()) return;
    if (type === 'INFO') {
      setInfoCategories(infoCategories.map(c => c.id === id ? { ...c, name: editCategoryName, icon: editCategoryIcon } : c));
    } else {
      setRulesCategories(rulesCategories.map(c => c.id === id ? { ...c, name: editCategoryName, icon: editCategoryIcon } : c));
    }
    setEditingCategory(null);
    toast.success('List diperbarui');
  };

  const handleDeleteCategory = (type: 'INFO' | 'RULES', id: string) => {
    if (!confirm('Hapus list ini beserta semua isinya?')) return false;
    if (type === 'INFO') {
      setInfoCategories(infoCategories.filter(c => c.id !== id));
    } else {
      setRulesCategories(rulesCategories.filter(c => c.id !== id));
    }
    toast.success('List dihapus');
    return true;
  };

  const submitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    if (!formData.jenisKegiatan) { toast.error('Jenis Kegiatan wajib diisi'); return; }
    toast.loading('Menyimpan data...', { id: 'save-post' });
    try {
      await fetch('/api/bulletin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
           department: departmentName,
           category: `${selectedCategory.type}::${selectedCategory.id}`,
           content: JSON.stringify(formData),
           authorNik: inspectorNik,
           authorName: inspectorName
        })
      });
      setShowForm(false);
      toast.success('Data berhasil disimpan', { id: 'save-post' });
      setFormData({ number: '0', jenisKegiatan: '', keterangan: '', pic: '', status: 'ON PROGRESS', priority: '', agendaDate: '' });
      fetchPosts();
    } catch(e) {
      toast.error('Gagal menyimpan data', { id: 'save-post' });
    }
  };

  
  const updatePostField = async (post: any, field: string, value: string) => {
    let data = { number: '0', jenisKegiatan: '', keterangan: '', pic: '', status: '', priority: '', agendaDate: '' };
    try { data = JSON.parse(post.content); } catch(e) {}
    
    data[field] = value;
    const newContent = JSON.stringify(data);
    
    setPosts(posts.map(p => p.id === post.id ? { ...p, content: newContent } : p));
    
    try {
      await fetch('/api/bulletin/' + post.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent })
      });
    } catch(e) {
      toast.error('Gagal update data');
      fetchPosts(); // revert
    }
  };

  const deletePost = async (id: number) => {
     toast.loading('Menghapus data...', { id: 'del-post' });
     try {
       await fetch(`/api/bulletin/${id}`, { method: 'DELETE' });
       toast.success('Data berhasil dihapus', { id: 'del-post' });
       fetchPosts();
     } catch(e) {
       toast.error('Gagal menghapus data', { id: 'del-post' });
     }
  };

  const renderIconSelector = (currentIcon: string, onSelect: (icon: string) => void) => (
    <div className="flex gap-1 overflow-x-auto p-1 rounded-md bg-black/5 hide-scrollbar">
      {Object.keys(AVAILABLE_ICONS).map(iconName => {
        const IconComponent = AVAILABLE_ICONS[iconName as keyof typeof AVAILABLE_ICONS];
        return (
          <button
            key={iconName}
            type="button"
            onClick={() => onSelect(iconName)}
            className={`p-1.5 rounded-md transition-all flex-shrink-0 ${currentIcon === iconName ? 'bg-white shadow-sm ring-1 ring-slate-300' : 'hover:bg-black/10'}`}
          >
            <IconComponent className="w-4 h-4 text-slate-600" />
          </button>
        )
      })}
    </div>
  );

  if (viewMode === 'menu') {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="space-y-6 pb-24 w-full h-full max-w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>{departmentName}</h1>
            <p className="text-sm opacity-60 font-medium" style={{ color: 'var(--text-main)' }}>Bulletin Board & Data Management</p>
          </div>
          
          <form onSubmit={handleSearch} className="relative w-full md:w-80">
            <div className="relative flex items-center w-full h-11 rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
               <div className="pl-3.5 pr-2 flex items-center justify-center text-slate-400">
                  <Search className="w-5 h-5" />
               </div>
               <input 
                 type="text" 
                 placeholder="Search topics, contents, or attachments..." 
                 className="flex-1 h-full bg-transparent outline-none text-sm font-medium text-slate-700 placeholder:text-slate-400"
                 value={searchQuery}
                 onChange={(e) => {
                   setSearchQuery(e.target.value);
                   if (!e.target.value) setShowSearchResults(false);
                 }}
               />
               {searchQuery && (
                 <button type="button" onClick={() => {setSearchQuery(''); setShowSearchResults(false);}} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                   <X className="w-4 h-4" />
                 </button>
               )}
            </div>
          </form>
        </div>

        {showSearchResults ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <Search className="w-5 h-5 text-blue-600" /> Search Results for "{searchQuery}"
                </h2>
                <Button variant="secondary" className="h-8 text-xs bg-white" onClick={() => {setSearchQuery(''); setShowSearchResults(false);}}>
                  Clear Search
                </Button>
             </div>
             <div className="p-4 space-y-4">
                {isSearching ? (
                  <div className="flex flex-col justify-center items-center h-40">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-3 text-sm text-slate-500">Searching across topics and attachments...</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                    <Search className="w-10 h-10 mb-3 opacity-20" />
                    <p className="text-sm font-medium">No results found.</p>
                    <p className="text-xs">Try different keywords.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {searchResults.map((post) => (
                       <div key={post.id} className="border border-slate-200 rounded-xl p-4 bg-white hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group" onClick={() => {
                         // Find the category of this post
                         let catType = 'INFO';
                         let catObj = null;
                         const catString = post.category || '';
                         
                         let foundId = catString;
                         if (catString.includes('::')) {
                           const parts = catString.split('::');
                           catType = parts[0];
                           foundId = parts[1];
                         }
                         
                         setSelectedCategory({ id: foundId, type: catType as any, name: post.parsedContent?.jenisKegiatan || 'Topic', icon: 'FileText' });
                         setSelectedPost(post);
                         setViewMode('topic');
                       }}>
                         <div className="flex items-start justify-between mb-3">
                           <div className="flex items-center gap-2">
                             <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                               <FileText className="w-4 h-4" />
                             </div>
                             <div>
                               <h3 className="font-bold text-slate-800 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">{post.parsedContent?.jenisKegiatan || 'Untitled'}</h3>
                               <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">{post.parsedContent?.pic || 'Unknown PIC'}</p>
                             </div>
                           </div>
                         </div>
                         <p className="text-xs text-slate-600 line-clamp-2 mb-3 bg-slate-50 p-2 rounded-lg border border-slate-100">{post.parsedContent?.keterangan || '-'}</p>
                         
                         {post.matchedComments && post.matchedComments.length > 0 && (
                           <div className="mt-3 pt-3 border-t border-slate-100">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5" /> Matched Attachments</p>
                              <div className="space-y-1.5">
                                {post.matchedComments.map((c: any, i: number) => (
                                  <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg p-1.5 border border-slate-100">
                                     {c.fileUrl && c.fileUrl.startsWith('data:image/') ? <FileText className="w-3 h-3 text-slate-400 shrink-0" /> : <Paperclip className="w-3 h-3 text-slate-400 shrink-0" />}
                                     <span className="text-[10px] text-slate-600 truncate">{c.fileName || c.content || 'Attachment'}</span>
                                  </div>
                                ))}
                              </div>
                           </div>
                         )}
                       </div>
                     ))}
                  </div>
                )}
             </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* INFO COLUMN */}
          <Card className="p-1 sm:p-2 border-0 shadow-lg bg-white/50 backdrop-blur-sm" style={{ backgroundColor: 'transparent' }}>
             <div className="flex justify-between items-center p-4 rounded-xl shadow-sm mb-4" style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>
                <h2 className="text-lg font-display font-bold flex items-center gap-2">
                  <BadgeInfo className="w-5 h-5 opacity-90" /> INFORMATION
                </h2>
             </div>
             
             <div className="space-y-2.5 p-2">
               {infoCategories.map((cat) => {
                 const Icon = AVAILABLE_ICONS[cat.icon as keyof typeof AVAILABLE_ICONS] || FileText;
                 const isEditing = editingCategory === cat.id;

                 if (isEditing) {
                   return (
                     <div key={cat.id} className="p-3 rounded-lg border shadow-sm space-y-3" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--primary)' }}>
                       <Input value={editCategoryName} onChange={e => setEditCategoryName(e.target.value)} className="h-8 text-sm" placeholder="Nama list..." />
                       {renderIconSelector(editCategoryIcon, setEditCategoryIcon)}
                       <div className="flex gap-2 justify-end">
                          <Button onClick={() => handleSaveEditCategory('INFO', cat.id)} className="h-8 text-xs px-3" style={{ backgroundColor: 'var(--primary)', color: '#fff' }}><Check className="w-4 h-4 mr-1"/> Simpan</Button>
                          <Button onClick={() => setEditingCategory(null)} variant="secondary" className="h-8 text-xs px-3 shadow-sm border"><X className="w-4 h-4 mr-1"/> Batal</Button>
                       </div>
                     </div>
                   );
                 }

                 return (
                   <div 
                     key={cat.id}
                     className="w-full text-left p-3 rounded-lg flex items-center justify-between transition-colors shadow-sm group"
                     style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-main)', borderWidth: 1, color: 'var(--text-main)' }}
                   >
                      <button 
                        className="flex items-center gap-3 flex-1 text-left"
                        onClick={() => { setSelectedCategory({...cat, type: 'INFO'}); setViewMode('detail'); }}
                      >
                        <Icon className="w-5 h-5 opacity-70" />
                        <span className="font-semibold text-sm">{cat.name}</span>
                      </button>
                      <div className="flex items-center gap-1 transition-opacity">
                        <button onClick={() => { setEditingCategory(cat.id); setEditCategoryName(cat.name); setEditCategoryIcon(cat.icon); }} className="p-1.5 rounded-md hover:bg-black/5 text-slate-400 hover:text-blue-600"><Edit2 className="w-4 h-4"/></button>
                        <button onClick={() => handleDeleteCategory('INFO', cat.id)} className="p-1.5 rounded-md hover:bg-black/5 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                      </div>
                   </div>
                 )
               })}
               
               {showAddCategory === 'INFO' ? (
                 <div className="p-3 border rounded-lg mt-2 shadow-sm space-y-3" style={{ borderColor: 'var(--primary)', backgroundColor: 'var(--card-bg)' }}>
                    <Input autoFocus value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Nama list baru..." className="h-8 text-sm" />
                    {renderIconSelector(newCategoryIcon, setNewCategoryIcon)}
                    <div className="flex gap-2 justify-end">
                      <Button onClick={() => handleAddCategory('INFO')} className="h-8 text-xs px-3" style={{ backgroundColor: 'var(--primary)', color: '#fff' }}><Check className="w-4 h-4 mr-1"/> Simpan</Button>
                      <Button onClick={() => setShowAddCategory(null)} variant="secondary" className="h-8 text-xs px-3 shadow-sm border"><X className="w-4 h-4 mr-1"/> Batal</Button>
                    </div>
                 </div>
               ) : (
                 <button onClick={() => setShowAddCategory('INFO')} className="w-full text-left p-3 rounded-lg border border-dashed flex items-center justify-center gap-2 opacity-60 hover:opacity-100 transition-opacity mt-2" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                   <Plus className="w-4 h-4" /> Tambah List Info
                 </button>
               )}
             </div>
          </Card>
          {/* RULES COLUMN */}
          <Card className="p-1 sm:p-2 border-0 shadow-lg bg-white/50 backdrop-blur-sm" style={{ backgroundColor: 'transparent' }}>
             <div className="flex justify-between items-center p-4 rounded-xl shadow-sm mb-4" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                <h2 className="text-lg font-display font-bold flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 opacity-90" /> RULES & GUIDELINES
                </h2>
             </div>
             
             <div className="space-y-2.5 p-2">
               {rulesCategories.map((cat) => {
                 const Icon = AVAILABLE_ICONS[cat.icon as keyof typeof AVAILABLE_ICONS] || FileText;
                 const isEditing = editingCategory === cat.id;

                 if (isEditing) {
                   return (
                     <div key={cat.id} className="p-3 rounded-lg border shadow-sm space-y-3" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--accent)' }}>
                       <Input value={editCategoryName} onChange={e => setEditCategoryName(e.target.value)} className="h-8 text-sm" placeholder="Nama list..." />
                       {renderIconSelector(editCategoryIcon, setEditCategoryIcon)}
                       <div className="flex gap-2 justify-end">
                          <Button onClick={() => handleSaveEditCategory('RULES', cat.id)} className="h-8 text-xs px-3" style={{ backgroundColor: 'var(--primary)', color: '#fff' }}><Check className="w-4 h-4 mr-1"/> Simpan</Button>
                          <Button onClick={() => setEditingCategory(null)} variant="secondary" className="h-8 text-xs px-3 shadow-sm border"><X className="w-4 h-4 mr-1"/> Batal</Button>
                       </div>
                     </div>
                   );
                 }

                 return (
                   <div 
                     key={cat.id}
                     className="w-full text-left p-3 rounded-lg flex items-center justify-between transition-colors shadow-sm group"
                     style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-main)', borderWidth: 1, color: 'var(--text-main)' }}
                   >
                      <button 
                        className="flex items-center gap-3 flex-1 text-left"
                        onClick={() => { setSelectedCategory({...cat, type: 'RULES'}); setViewMode('detail'); }}
                      >
                        <Icon className="w-5 h-5 opacity-70" />
                        <span className="font-semibold text-sm">{cat.name}</span>
                      </button>
                      <div className="flex items-center gap-1 transition-opacity">
                        <button onClick={() => { setEditingCategory(cat.id); setEditCategoryName(cat.name); setEditCategoryIcon(cat.icon); }} className="p-1.5 rounded-md hover:bg-black/5 text-slate-400 hover:text-blue-600"><Edit2 className="w-4 h-4"/></button>
                        <button onClick={() => handleDeleteCategory('RULES', cat.id)} className="p-1.5 rounded-md hover:bg-black/5 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                      </div>
                   </div>
                 )
               })}
               
               {showAddCategory === 'RULES' ? (
                 <div className="p-3 border rounded-lg mt-2 shadow-sm space-y-3" style={{ borderColor: 'var(--accent)', backgroundColor: 'var(--card-bg)' }}>
                    <Input autoFocus value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Nama list baru..." className="h-8 text-sm" />
                    {renderIconSelector(newCategoryIcon, setNewCategoryIcon)}
                    <div className="flex gap-2 justify-end">
                      <Button onClick={() => handleAddCategory('RULES')} className="h-8 text-xs px-3" style={{ backgroundColor: 'var(--primary)', color: '#fff' }}><Check className="w-4 h-4 mr-1"/> Simpan</Button>
                      <Button onClick={() => setShowAddCategory(null)} variant="secondary" className="h-8 text-xs px-3 shadow-sm border"><X className="w-4 h-4 mr-1"/> Batal</Button>
                    </div>
                 </div>
               ) : (
                 <button onClick={() => setShowAddCategory('RULES')} className="w-full text-left p-3 rounded-lg border border-dashed flex items-center justify-center gap-2 opacity-60 hover:opacity-100 transition-opacity mt-2" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                   <Plus className="w-4 h-4" /> Tambah List Rules
                 </button>
               )}
             </div>
          </Card>
        </div>
        )}
      </motion.div>
    );
  }
  // Detail View
  const targetCategoryString = `${selectedCategory?.type}::${selectedCategory?.id}`;
  // Fallback to name matching for older posts before ID migration
  const fallbackCategoryString = `${selectedCategory?.type}::${selectedCategory?.name}`;
  
  const filteredPosts = posts.filter(p => p.department === departmentName && (p.category === targetCategoryString || p.category === fallbackCategoryString));
  const SelectedIcon = selectedCategory ? (AVAILABLE_ICONS[selectedCategory.icon as keyof typeof AVAILABLE_ICONS] || FileText) : FileText;

  if (viewMode === 'topic' && selectedPost) {
    return (
      <BulletinTopicDetail 
        post={selectedPost} 
        inspectorName={inspectorName} 
        inspectorNik={inspectorNik} 
        departmentName={departmentName}
        categoryName={selectedCategory?.name || ''}
        onBack={() => { setViewMode('detail'); setSelectedPost(null); }} 
      />
    );
  }
  
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="space-y-6 pb-24 w-full h-full max-w-full">
      <h1 className="text-2xl md:text-3xl font-black uppercase mb-4" style={{ color: 'var(--text-main)' }}>{selectedCategory?.name}</h1>
      
      {/* Breadcrumb */}
      <div className="flex flex-col gap-2 mb-6">
         <Button 
           onClick={() => setViewMode('menu')}
           variant="secondary" 
           className="shadow-sm border flex items-center w-fit px-4 text-xs h-8 hover:bg-black/5" 
           style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', borderColor: 'var(--border-main)' }}
         >
           <Home className="w-3 h-3 mr-2" /> HOME {departmentName.toUpperCase()}
         </Button>
         <div className="flex items-center gap-2 p-2 rounded-md w-full shadow-sm" style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>
            <ChevronRight className="w-4 h-4" />
            <span className="text-xs font-semibold">Menu Info {departmentName}</span>
         </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
         <div className="flex items-center gap-2 bg-slate-100/50 p-1 rounded-lg border border-slate-200/60">
            <button className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold shadow-sm bg-white text-slate-800">
              <AlignLeft className="w-4 h-4" /> Data Table
            </button>
            <button disabled className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-slate-400 cursor-not-allowed">
              <Calendar className="w-4 h-4" /> Calendar View
            </button>
         </div>
         {selectedCategory && (
           <Button 
             variant="secondary"
             onClick={() => {
               const confirmed = handleDeleteCategory(selectedCategory.type, selectedCategory.id);
               if (confirmed) {
                 setViewMode('menu');
                 setSelectedCategory(null);
               }
             }}
             className="text-sm h-10 px-4 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 shadow-sm rounded-xl"
           >
             <Trash2 className="w-4 h-4 mr-2" /> Delete List
           </Button>
         )}
      </div>

      <div className="w-full overflow-x-auto rounded-xl border shadow-sm" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-main)' }}>
         <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase border-b" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)', borderColor: 'var(--border-main)' }}>
               <tr>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap" style={{ width: "80px" }}><div className="flex items-center gap-1">NO</div></th>
                  <th className="px-4 py-3 font-semibold min-w-[200px]"><div className="flex items-center gap-1">JENIS KEGIATAN</div></th>
                  <th className="px-4 py-3 font-semibold min-w-[300px]"><div className="flex items-center gap-1">KETERANGAN</div></th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap"><div className="flex items-center gap-1">PIC</div></th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap"><div className="flex items-center gap-1">STATUS</div></th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap"><div className="flex items-center gap-1">PRIORITY</div></th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap"><div className="flex items-center gap-1">TANGGAL AGENDA</div></th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap"><div className="flex items-center gap-1">CREATED TIME</div></th>
                  <th className="px-4 py-3"></th>
               </tr>
            </thead>
            
            <tbody>
               {filteredPosts.map(post => {
                  let data = { number: '0', jenisKegiatan: '', keterangan: '', pic: '', status: '', priority: '', agendaDate: '' };
                  try { data = JSON.parse(post.content); } catch(e) {}
                  
                  return (
                    <tr key={post.id} className="border-b transition-colors hover:bg-black/5" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                      <td className="px-4 py-3 font-mono text-center" style={{ width: "80px" }}>
                        <input type="text" className="w-full bg-transparent outline-none border-b border-transparent hover:border-slate-300 focus:border-blue-500 text-center" value={data.number || ''} onChange={e => updatePostField(post, 'number', e.target.value)} />
                      </td>
                      <td className="px-4 py-3 font-semibold group relative">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 opacity-50 flex-shrink-0" />
                          <input type="text" className="w-full bg-transparent outline-none border-b border-transparent hover:border-slate-300 focus:border-blue-500" value={data.jenisKegiatan || ''} onChange={e => updatePostField(post, 'jenisKegiatan', e.target.value)} />
                          <button onClick={() => { setSelectedPost(post); setViewMode('topic'); }} className="flex sm:opacity-0 group-hover:opacity-100 opacity-100 transition-opacity items-center gap-1 px-2 py-1 bg-slate-700 text-white text-[10px] rounded hover:bg-slate-600 whitespace-nowrap transition-colors shadow-sm ml-2 absolute right-2">
                             <MessageSquare className="w-3 h-3" /> OPEN
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs opacity-80">
                         <textarea className="w-full bg-transparent outline-none resize-none border-b border-transparent hover:border-slate-300 focus:border-blue-500 min-h-[30px]" value={data.keterangan || ''} onChange={e => updatePostField(post, 'keterangan', e.target.value)} />
                      </td>
                      <td className="px-4 py-3 text-xs font-medium">
                        <input list="pic-list" type="text" className="w-full bg-transparent outline-none border-b border-transparent hover:border-slate-300 focus:border-blue-500" value={data.pic || ''} onChange={e => updatePostField(post, 'pic', e.target.value)} />
                      </td>
                      <td className="px-4 py-3">
                         <select className="px-2 py-1 text-[10px] font-bold rounded outline-none w-full" style={{ backgroundColor: data.status === 'DONE' ? 'rgba(34, 197, 94, 0.2)' : data.status === 'PENDING' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)', color: data.status === 'DONE' ? 'rgb(21, 128, 61)' : data.status === 'PENDING' ? 'rgb(185, 28, 28)' : 'rgb(202, 138, 4)', border: `1px solid ${data.status === 'DONE' ? 'rgba(34,197,94,0.4)' : data.status === 'PENDING' ? 'rgba(239,68,68,0.4)' : 'rgba(234,179,8,0.4)'}` }} value={data.status || 'ON PROGRESS'} onChange={e => updatePostField(post, 'status', e.target.value)}>
                            <option value="ON PROGRESS">ON PROGRESS</option>
                            <option value="DONE">DONE</option>
                            <option value="PENDING">PENDING</option>
                         </select>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <input type="text" className="w-full bg-transparent outline-none border-b border-transparent hover:border-slate-300 focus:border-blue-500" value={data.priority || ''} onChange={e => updatePostField(post, 'priority', e.target.value)} />
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <input type="datetime-local" className="w-full bg-transparent outline-none border-b border-transparent hover:border-slate-300 focus:border-blue-500 text-xs" style={{ color: 'var(--text-main)' }} value={data.agendaDate || ''} onChange={e => updatePostField(post, 'agendaDate', e.target.value)} />
                      </td>
                      <td className="px-4 py-3 text-xs opacity-70 whitespace-nowrap">{new Date(post.createdAt).toLocaleString('id-ID', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => deletePost(post.id)} className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
               })}
            
            </tbody>
            <tfoot>
               {!showForm ? (
                 <tr>
                   <td colSpan={9} className="p-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                     <button onClick={() => setShowForm(true)} className="flex items-center gap-2 text-sm font-semibold opacity-70 hover:opacity-100 transition-opacity" style={{ color: 'var(--primary)' }}>
                       <Plus className="w-4 h-4" /> New Line
                     </button>
                   </td>
                 </tr>
               ) : (
                 <tr className="border-t bg-black/5" style={{ borderColor: 'var(--border-main)' }}>
                   <td className="px-4 py-3 align-top" style={{ width: "80px" }}>
                     <label className="text-[10px] uppercase font-semibold opacity-70 block mb-1">NO</label>
                     <input type="number" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} className="w-full h-9 text-sm px-3 rounded-md border outline-none" style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-main)' }} />
                   </td>
                   <td className="px-4 py-3 align-top">
                     <label className="text-[10px] uppercase font-semibold opacity-70 block mb-1">Jenis Kegiatan</label>
                     <input required type="text" value={formData.jenisKegiatan} onChange={e => setFormData({...formData, jenisKegiatan: e.target.value})} className="w-full h-9 text-sm px-3 rounded-md border outline-none" style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-main)' }} placeholder="Nama kegiatan..." />
                   </td>
                   <td className="px-4 py-3 align-top">
                     <label className="text-[10px] uppercase font-semibold opacity-70 block mb-1">Keterangan</label>
                     <textarea value={formData.keterangan} onChange={e => setFormData({...formData, keterangan: e.target.value})} className="w-full h-9 min-h-[36px] text-sm px-3 py-1.5 rounded-md border outline-none resize-none" style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-main)' }} placeholder="Detail keterangan..." />
                   </td>
                   <td className="px-4 py-3 align-top">
                     <label className="text-[10px] uppercase font-semibold opacity-70 block mb-1">PIC</label>
                     <input list="pic-list" type="text" value={formData.pic} onChange={e => setFormData({...formData, pic: e.target.value})} className="w-full h-9 text-sm px-3 rounded-md border" style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-main)' }} placeholder="Nama PIC" />
                   </td>
                   <td className="px-4 py-3 align-top">
                     <label className="text-[10px] uppercase font-semibold opacity-70 block mb-1">Status</label>
                     <select className="w-full h-9 px-3 text-sm font-bold rounded-md border outline-none appearance-none" style={{ backgroundColor: formData.status === 'DONE' ? 'rgba(34, 197, 94, 0.2)' : formData.status === 'PENDING' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)', color: formData.status === 'DONE' ? 'rgb(21, 128, 61)' : formData.status === 'PENDING' ? 'rgb(185, 28, 28)' : 'rgb(202, 138, 4)', borderColor: formData.status === 'DONE' ? 'rgba(34,197,94,0.4)' : formData.status === 'PENDING' ? 'rgba(239,68,68,0.4)' : 'rgba(234,179,8,0.4)' }} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}><option value="ON PROGRESS">ON PROGRESS</option><option value="DONE">DONE</option><option value="PENDING">PENDING</option></select>
                   </td>
                   <td className="px-4 py-3 align-top">
                     <label className="text-[10px] uppercase font-semibold opacity-70 block mb-1">Priority</label>
                     <input type="text" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full h-9 text-sm px-3 rounded-md border outline-none" style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-main)' }} placeholder="Low/High" />
                   </td>
                   <td className="px-4 py-3 align-top">
                     <label className="text-[10px] uppercase font-semibold opacity-70 block mb-1">Tanggal Agenda</label>
                     <input type="datetime-local" value={formData.agendaDate} onChange={e => setFormData({...formData, agendaDate: e.target.value})} className="w-full h-9 text-sm px-3 rounded-md border outline-none text-xs" style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }} />
                   </td>
                   <td colSpan={2} className="px-4 py-3 align-bottom">
                     <div className="flex items-center gap-2 mb-1">
                       <Button onClick={submitPost} type="button" className="h-9 text-sm px-4" style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>Save</Button>
                       <Button onClick={() => setShowForm(false)} variant="secondary" type="button" className="h-9 text-sm px-4 shadow-sm border" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', borderColor: 'var(--border-main)' }}>Cancel</Button>
                     </div>
                   </td>
                 </tr>
               )}
            </tfoot>
         </table>
               <datalist id="pic-list">
            <option value="Administration" />
            <option value="Preparation" />
            <option value="Laboratory" />
            <option value="Maintenance" />
            <option value="Quality Assurance" />
            {employees.map(emp => (
              <option key={emp.name} value={emp.name} />
            ))}
         </datalist>
      </div>
    </motion.div>
  );
}
