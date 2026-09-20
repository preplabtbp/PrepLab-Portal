import { CreateInternalTicketScreen } from './create-internal-ticket-screen';
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Card, Input, Select, Textarea, Button } from './ui';
import { appendRowsToSheet, ToolRecord, uploadPhotoToDrive} from '../sheets-api';
import { 
  CheckCircle2, Loader2, Image as ImageIcon, UploadCloud, RotateCcw, PlusCircle,
  Sparkles, AlertCircle, Info, ChevronDown, Check, X, Search, AlertTriangle
} from 'lucide-react';
import { ImageModal } from './image-modal';
import { DevModeAccordion, useDevOptions } from './dev-mode-accordion';
import { WhatsAppModal } from './whatsapp-modal';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'sonner';
import { workOrderSchema } from '../lib/zod';
import { PageHeader } from './PageHeader';
import { 
  normalizeEquipment, 
  STANDARD_NON_INSTRUMENT_NAMES, 
  STANDARD_NON_INSTRUMENT_CATALOG, 
  StandardNonInstrumentItem, 
  findSmartSuggest 
} from '../lib/equipmentNormalizer';
import { KbbiCorrectorWidget } from './KbbiCorrectorWidget';

export function CreateWOScreen({ inspectorName, inspectorNik, equipmentCategories }: { inspectorName: string, inspectorNik: string, equipmentCategories: {category: string, tools: ToolRecord[]}[] }) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    shift: 'Pagi',
    tipeWO: 'Instrument',
    toolSearch: '',
    toolNameManual: '',
    ruangan: '',
    deskripsi: '',
    fotoUrl: ''
  });
  
  // Non-Instrument Category & Smart Suggest States
  const [selectedNonInstrCategory, setSelectedNonInstrCategory] = useState<StandardNonInstrumentItem | null>(null);
  const [nonInstrSearchQuery, setNonInstrSearchQuery] = useState('');
  const [nonInstrDetail, setNonInstrDetail] = useState('');
  const [isNonInstrDropdownOpen, setIsNonInstrDropdownOpen] = useState(false);
  const nonInstrRef = useRef<HTMLDivElement>(null);
  
  const [activeWoTab, setActiveWoTab] = useState<'kerusakan' | 'permintaan'>('kerusakan');

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [waMessageText, setWaMessageText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedTool, setSelectedTool] = useState<ToolRecord | null>(null);
  
  const sigPad = useRef<any>(null);

  const { devOptions, setDevOptions, parsedDevOptions } = useDevOptions(inspectorNik);

  // Click outside to close non-instr dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (nonInstrRef.current && !nonInstrRef.current.contains(event.target as Node)) {
        setIsNonInstrDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute smart suggestions based on user query
  const smartSuggestions = useMemo(() => {
    if (!nonInstrSearchQuery.trim()) return [];
    return findSmartSuggest(nonInstrSearchQuery);
  }, [nonInstrSearchQuery]);

  const topKeywordMatch = useMemo(() => {
    return smartSuggestions.find(s => s.matchType === 'keyword' || s.score >= 90);
  }, [smartSuggestions]);

  // Grouped standard categories for clean browsing
  const groupedCategories = useMemo(() => {
    const filtered = nonInstrSearchQuery.trim()
      ? smartSuggestions.map(s => s.item)
      : STANDARD_NON_INSTRUMENT_CATALOG;

    const map = new Map<string, StandardNonInstrumentItem[]>();
    for (const item of filtered) {
      const group = item.categoryGroup || 'Lainnya';
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(item);
    }
    return Array.from(map.entries());
  }, [nonInstrSearchQuery, smartSuggestions]);

  const formatToolDisplay = React.useCallback((t: ToolRecord) => {
    const parts = [t.name];
    
    let codeStr = t.assetNumber && t.assetNumber.trim() !== '' && t.assetNumber.trim() !== '-' ? t.assetNumber.trim() : null;
    
    if (codeStr && codeStr.toLowerCase() !== t.name.toLowerCase()) {
      parts.push(codeStr);
    }
    
    let locationStr = t.location && t.location.trim() !== '' && t.location.trim() !== '-' ? t.location.trim() : null;
    if (!locationStr && t.itemCategory && t.itemCategory.trim() !== '') {
       locationStr = t.itemCategory.trim();
    }
    
    if (locationStr) {
      parts.push(locationStr);
    }
    
    return parts.join(' - ');
  }, []);

  const flatTools = React.useMemo(() => {
    return equipmentCategories.flatMap(c => c.tools).sort((a, b) => {
      const nameA = formatToolDisplay(a).toLowerCase();
      const nameB = formatToolDisplay(b).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [equipmentCategories, formatToolDisplay]);

  const handleToolSearchChange = (val: string) => {
    setFormData(prev => ({...prev, toolSearch: val}));
    
    const matchedTool = flatTools.find(
      t => formatToolDisplay(t) === val || t.id === val || t.name === val
    );
    
    if (matchedTool) {
      setSelectedTool(matchedTool);
      setFormData(prev => ({
        ...prev,
        toolSearch: val,
        ruangan: matchedTool.location || ''
      }));
    } else {
      setSelectedTool(null);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        setIsUploading(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64 = reader.result as string;
            const base64Data = base64.split(',')[1];
            const url = await uploadPhotoToDrive(base64Data, file.type, file.name, 'Work Orders');
            setFormData(prev => ({ ...prev, fotoUrl: url }));
          } catch(e) {
            console.error("Gagal upload", e);
            toast.error("Gagal upload foto");
          } finally {
            setIsUploading(false);
          }
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error(err);
        setIsUploading(false);
      }
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const now = new Date();
      
      // Update location di database alat jika berubah
      if (formData.tipeWO === 'Instrument' && selectedTool && formData.ruangan && formData.ruangan !== selectedTool.location) {
        try {
          // await gasRequest('updateLocation', { 
//    sheetOrigin: selectedTool.sheetOrigin, 
//    rowIndex: selectedTool.rowIndex, 
//    location: formData.ruangan 
// });
        } catch(err) {
           console.error("Gagal update lokasi di database alat", err);
        }
      }

      let toolId = '-';
      let toolName = '-';

      if (formData.tipeWO === 'Instrument') {
        if (!selectedTool && !formData.toolSearch.trim()) {
          toast.error('Harap pilih alat instrumen yang rusak!');
          setSubmitting(false);
          return;
        }
        toolId = selectedTool ? selectedTool.id : '-';
        toolName = selectedTool ? selectedTool.name : (formData.toolSearch.split(' - ')[0] || formData.toolSearch || '-');
      } else {
        if (!selectedNonInstrCategory) {
          toast.error('Harap pilih kategori mesin/asset yang valid dari daftar! Jika belum terdaftar, harap hubungi Tim QA.');
          setSubmitting(false);
          return;
        }
        if (!nonInstrDetail.trim()) {
          toast.error('Harap isi Nama Detail / Spesifikasi mesin/asset agar tim maintenance mudah menelusuri unit di lapangan!');
          setSubmitting(false);
          return;
        }
        toolName = `${selectedNonInstrCategory.name} - ${nonInstrDetail.trim()}`;
        toolId = selectedNonInstrCategory.code;
      }

      // Get signature base64
      
      const validation = workOrderSchema.safeParse({
        equipmentName: toolName,
        issueDescription: formData.deskripsi,
        requestorName: inspectorName
      });
      
      if (!validation.success) {
        toast.error(validation.error.issues[0].message);
        setSubmitting(false);
        return;
      }

      let signatureData = '';
      if (sigPad.current && !sigPad.current.isEmpty()) {
         const rawData = sigPad.current.getCanvas().toDataURL('image/png');
         const base64Data = rawData.split(',')[1];
         // Upload signature to Drive
         signatureData = await uploadPhotoToDrive(base64Data, 'image/png', `signature_${new Date().getTime()}.png`, 'Signatures');
      }

      const rowData = {
        nik: localStorage.getItem('p2h_inspector_nik') || '-',
        namaKaryawan: inspectorName,
        jabatanKaryawan: localStorage.getItem('p2h_inspector_jabatan') || 'Crew',
        shift: formData.shift,
        priority: 'Medium',
        noAlat: toolId,
        noAsset: '-',
        posisiAlat: '-',
        namaAlat: toolName,
        ruangan: formData.ruangan,
        kategori: formData.tipeWO,
        jenisWO: formData.tipeWO,
        kerusakan: formData.deskripsi,
        fotoKerusakan: formData.fotoUrl,
        ttdUser: signatureData,
        devOptions: parsedDevOptions
      };

      const res = await fetch('/api/work-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
  date: new Date().toISOString(),
  requestorNik: rowData.nik,
  requestorName: rowData.namaKaryawan,
  equipmentCode: rowData.noAlat,
  equipmentName: rowData.namaAlat,
  location: rowData.ruangan,
  category: rowData.kategori,
  priority: rowData.priority,
  issueDescription: rowData.kerusakan,
  status: 'Open',
  photoUrl: rowData.fotoKerusakan,
  shift: rowData.shift,
  ttdUser: rowData.ttdUser,
  devOptions: parsedDevOptions
}) });
      
      const createdWO = await res.json();
      setSuccess(true);
      toast.success('Work Order berhasil dikirim!');
      
      if (createdWO.waMessageText) {
          setWaMessageText(createdWO.waMessageText);
      }
      setFormData({
        shift: 'Pagi',
        tipeWO: 'Instrument',
        toolSearch: '',
        toolNameManual: '',
        ruangan: '',
        deskripsi: '',
        fotoUrl: ''
      });
      setSelectedTool(null);
      setSelectedNonInstrCategory(null);
      setNonInstrSearchQuery('');
      setNonInstrDetail('');
      setIsNonInstrDropdownOpen(false);
      if (sigPad.current) sigPad.current.clear();
      
      // setTimeout(() => setSuccess(false), 3000); // Removed so user can click WA
    } catch (error) {
      console.error(error);
      toast.error(`Gagal mengirim Work Order. Pesan Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-10 w-full max-w-full md:px-8">
      <PageHeader 
        title="Buat Work Order"
        description="Form laporan kerusakan dan permintaan"
        icon={<PlusCircle />}
      />
      
      <div className="flex gap-2 p-1 bg-slate-100 rounded-lg max-w-sm">
        <button 
          onClick={() => setActiveWoTab('kerusakan')}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${activeWoTab === 'kerusakan' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
        >
          WO Kerusakan
        </button>
        <button 
          onClick={() => setActiveWoTab('permintaan')}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${activeWoTab === 'permintaan' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
        >
          WO Permintaan
        </button>
      </div>

      {activeWoTab === 'kerusakan' && (
      <>
      <DevModeAccordion inspectorNik={inspectorNik} devOptions={devOptions} setDevOptions={setDevOptions} />

      {success && (
        <div className="bg-teal-50 border border-teal-200 text-teal-800 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-teal-500 flex-shrink-0" />
          <p className="text-sm font-medium">Work Order berhasil dikirim!</p>
        </div>
      )}
      
      <WhatsAppModal 
        isOpen={!!waMessageText} 
        onClose={() => {
           setWaMessageText('');
           setTimeout(() => setSuccess(false), 3000);
        }}
        messageText={waMessageText}
      />
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 space-y-6 shadow-sm border-t-4 border-t-teal-500 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select 
              label="Shift" 
              value={formData.shift} 
              onChange={e => setFormData({...formData, shift: e.target.value})}

              options={[
                {value: "Pagi", label: "Pagi"},
                {value: "Malam", label: "Malam"},
                {value: "Longshift", label: "Longshift"}
              ]}
            />
            <Select 
              label="Tipe WO" 
              value={formData.tipeWO} 
              onChange={e => {
                setFormData({...formData, tipeWO: e.target.value});
                setSelectedTool(null);
                setSelectedNonInstrCategory(null);
                setNonInstrSearchQuery('');
                setNonInstrDetail('');
                setIsNonInstrDropdownOpen(false);
              }}
              options={[
                {value: "Instrument", label: "Instrument"},
                {value: "Non-Instrument", label: "Non-Instrument"}
              ]}
            />
          </div>

          <div className="space-y-3 relative">
            <label className="block text-sm font-semibold text-slate-800">
              {formData.tipeWO === 'Instrument' ? 'Cari Alat Instrumen Rusak' : 'Kategori Mesin / Asset Rusak'}
            </label>
            
            {formData.tipeWO === 'Instrument' ? (
              <>
                <input 
                  list="tools-list"
                  type="text"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white shadow-xs"
                  placeholder="Ketik untuk mencari ID / Nama Alat Instrumen..."
                  value={formData.toolSearch}
                  onChange={(e) => handleToolSearchChange(e.target.value)}
                  required
                />
                <datalist id="tools-list">
                  {flatTools.map((t, idx) => (
                    <option key={`${t.id}-${idx}`} value={formatToolDisplay(t)} />
                  ))}
                </datalist>
                
                {selectedTool && (
                   <div className="text-xs text-teal-800 bg-teal-50 px-3 py-2.5 rounded-xl border border-teal-200 font-medium flex items-center justify-between shadow-2xs">
                     <span>Alat Terdeteksi: <strong>{selectedTool.name}</strong> {(selectedTool.id && selectedTool.id.trim() !== '-' && selectedTool.id.trim() !== '') ? `(${selectedTool.id})` : ''}</span>
                     <span className="text-[10px] text-teal-800 bg-teal-100 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Tervalidasi</span>
                   </div>
                )}

                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                  <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Instrumen tidak ditemukan? <strong>Harap hubungi Tim QA</strong> untuk registrasi alat baru.</span>
                </div>
              </>
            ) : (
              <div className="space-y-3" ref={nonInstrRef}>
                {/* 1. KATEGORI SELECTION CONTAINER */}
                {selectedNonInstrCategory ? (
                  <div className="p-3.5 rounded-xl border-2 border-teal-500 bg-teal-50/70 shadow-xs space-y-3 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800">Kategori Terpilih:</span>
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-200 text-teal-900 border border-teal-300">
                              {selectedNonInstrCategory.code}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-600 bg-white/90 px-2 py-0.2 rounded border border-slate-200">
                              {selectedNonInstrCategory.categoryGroup}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 mt-0.5">
                            {selectedNonInstrCategory.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {selectedNonInstrCategory.description}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedNonInstrCategory(null);
                          setIsNonInstrDropdownOpen(true);
                        }}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                        title="Klik untuk memilih kategori lain"
                      >
                        <RotateCcw className="w-3 h-3 text-slate-500" />
                        <span>Ganti</span>
                      </button>
                    </div>

                    {/* 2. INPUT NAMA DETAIL / SPESIFIKASI ALAT (MUNCUL SETELAH MEMILIH KATEGORI) */}
                    <div className="pt-3 border-t border-teal-200/80 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                      <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <span>Nama Detail / Spesifikasi Mesin / Aset Rusak</span>
                          <span className="text-rose-500">*</span>
                        </span>
                        <span className="text-[10.5px] font-semibold text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                          Wajib diisi
                        </span>
                      </label>
                      <input
                        type="text"
                        className="w-full px-3.5 py-2.5 border-2 border-teal-500/50 rounded-xl text-sm focus:ring-4 focus:ring-teal-500/20 focus:border-teal-600 bg-white shadow-xs font-medium placeholder:text-slate-400"
                        placeholder={selectedNonInstrCategory.detailPlaceholder}
                        value={nonInstrDetail}
                        onChange={(e) => setNonInstrDetail(e.target.value)}
                        required
                        autoFocus
                      />
                      <KbbiCorrectorWidget 
                        value={nonInstrDetail}
                        onChange={setNonInstrDetail}
                        fieldName="Nama Detail Alat"
                      />
                      <p className="text-[11px] text-slate-600 flex items-center gap-1.5 mt-1">
                        <Info className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>Tuliskan nomor unit, merk, atau spesifikasi detail alat agar tim maintenance mudah menelusuri di lapangan.</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Search / Select Category Input */}
                    <div className="relative">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input 
                          type="text"
                          className="w-full pl-9.5 pr-8 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white shadow-xs placeholder:text-slate-400"
                          placeholder="Ketik untuk mencari kategori (cth: PC, CPU, AC, Arco, Sekop, Lampu, Plafon)..."
                          value={nonInstrSearchQuery}
                          onChange={(e) => {
                            setNonInstrSearchQuery(e.target.value);
                            setIsNonInstrDropdownOpen(true);
                          }}
                          onFocus={() => setIsNonInstrDropdownOpen(true)}
                        />
                        {nonInstrSearchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setNonInstrSearchQuery('');
                              setIsNonInstrDropdownOpen(true);
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* SMART SUGGESTION BANNER (IF KEYWORD MATCH FOUND) */}
                      {topKeywordMatch && (
                        <div 
                          onClick={() => {
                            setSelectedNonInstrCategory(topKeywordMatch.item);
                            setIsNonInstrDropdownOpen(false);
                          }}
                          className="mt-2 p-2.5 rounded-xl border-2 border-teal-500 bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 hover:from-teal-100 hover:to-emerald-100 cursor-pointer shadow-xs transition-all flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                              <Sparkles className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">Rekomendasi Pintar (Smart Suggest):</span>
                                <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-teal-200 text-teal-900 border border-teal-300">{topKeywordMatch.item.code}</span>
                              </div>
                              <h5 className="font-bold text-xs text-slate-900 group-hover:text-teal-700 transition-colors">
                                {topKeywordMatch.item.name}
                              </h5>
                              <p className="text-[10.5px] text-slate-500 line-clamp-1">
                                {topKeywordMatch.matchedKeyword && `Kata kunci cocok: "${topKeywordMatch.matchedKeyword}" • `}{topKeywordMatch.item.categoryGroup}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-teal-700 bg-white px-2.5 py-1 rounded-lg border border-teal-300 shadow-2xs group-hover:bg-teal-600 group-hover:text-white transition-colors shrink-0">
                            Pilih Kategori Ini →
                          </span>
                        </div>
                      )}

                      {/* DROPDOWN MENU OF STANDARDIZED CATEGORIES */}
                      {isNonInstrDropdownOpen && (
                        <div className="absolute z-20 left-0 right-0 mt-1 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100 text-xs">
                          {groupedCategories.length === 0 ? (
                            <div className="p-4 text-center space-y-2">
                              <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                                <AlertTriangle className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-800">Kategori Tidak Ditemukan</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  Nama mesin/asset harus terdaftar dalam kategori resmi agar data laporan valid.
                                </p>
                              </div>
                              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-medium text-left flex items-start gap-2">
                                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <span>Jika ingin menambahkan kategori atau jenis aset baru, <strong>harap hubungi Tim QA</strong>.</span>
                              </div>
                            </div>
                          ) : (
                            groupedCategories.map(([groupName, items]) => (
                              <div key={groupName} className="p-1.5">
                                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 rounded">
                                  {groupName} ({items.length})
                                </div>
                                <div className="mt-1 space-y-0.5">
                                  {items.map(item => (
                                    <button
                                      type="button"
                                      key={item.code}
                                      onClick={() => {
                                        setSelectedNonInstrCategory(item);
                                        setIsNonInstrDropdownOpen(false);
                                      }}
                                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-teal-50 transition-colors flex items-center justify-between group cursor-pointer"
                                    >
                                      <div className="min-w-0 pr-2">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-bold text-slate-800 text-xs group-hover:text-teal-700">
                                            {item.name}
                                          </span>
                                          <span className="font-mono text-[9px] font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 group-hover:bg-teal-100 group-hover:text-teal-800">
                                            {item.code}
                                          </span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                          {item.description}
                                        </p>
                                      </div>
                                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 -rotate-90 shrink-0" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* QA Contact Notice */}
                    <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Info className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Nama mesin/asset harus sesuai kategori terdaftar. Ingin menambahkan kategori baru?</span>
                      </div>
                      <span className="font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded text-[10px] border border-amber-300 shrink-0 whitespace-nowrap">
                        Hubungi Tim QA
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <Input 
            label="Posisi / Ruangan" 
            placeholder="Contoh: Ruang Preparasi 1"
            value={formData.ruangan}
            onChange={e => setFormData({...formData, ruangan: e.target.value})}
            required
            className={formData.tipeWO === 'Instrument' && selectedTool ? 'border-teal-300 ring-2 ring-teal-50' : ''}
          />
          {formData.tipeWO === 'Instrument' && selectedTool && (
            <p className="text-xs text-slate-400 -mt-2">
              *Lokasi otomatis terisi dari DB. Jika Anda mengubahnya, lokasi di DB juga akan terupdate.
            </p>
          )}

          <Textarea 
            label="Deskripsi Kerusakan" 
            placeholder="Jelaskan secara detail masalah yang terjadi..."
            rows={4}
            value={formData.deskripsi}
            onChange={e => setFormData({...formData, deskripsi: e.target.value})}
            required
          />
          <KbbiCorrectorWidget 
            value={formData.deskripsi}
            onChange={(newVal) => setFormData(prev => ({ ...prev, deskripsi: newVal }))}
            showTemplates={true}
            fieldName="Deskripsi Kerusakan"
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Upload Foto Bukti</label>
            <div className={`border-2 border-dashed ${formData.fotoUrl ? 'border-teal-300 bg-teal-50' : 'border-slate-200 bg-slate-50'} rounded-xl p-4 transition-all`}>
              {isUploading ? (
                <div className="flex flex-col items-center justify-center py-4 space-y-3">
                  <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
                  <span className="text-sm font-medium text-slate-500">Mengupload Foto...</span>
                </div>
              ) : formData.fotoUrl ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="w-12 h-12 rounded-lg bg-white shadow-sm flex items-center justify-center p-1 shrink-0">
                      <img src={formData.fotoUrl} alt="Preview" className="w-full h-full object-cover rounded" />
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-teal-800">Foto Terupload</p>
                      <button type="button" onClick={() => setSelectedImage(formData.fotoUrl)} className="text-teal-600 hover:underline text-xs break-all">Lihat Foto</button>
                    </div>
                  </div>
                  <label className="text-xs font-semibold bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors shadow-sm whitespace-nowrap">
                    Ganti Foto
                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                  </label>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center py-6 cursor-pointer group">
                  <div className="w-12 h-12 bg-white shadow-sm ring-1 ring-slate-900/5 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-5 h-5 text-slate-400 group-hover:text-teal-500 transition-colors" />
                  </div>
                  <span className="text-sm font-medium text-slate-600 group-hover:text-teal-600 transition-colors">Pilih dari Galeri / Kamera</span>
                  <span className="text-xs text-slate-400 mt-1">Format: JPG, PNG, dll</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                </label>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Tanda Tangan Pelapor</label>
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm relative">
                <SignatureCanvas 
                  ref={sigPad}
                  canvasProps={{className: "w-full h-40"}}
                  backgroundColor="rgba(255,255,255,1)"
                />
                <button 
                  type="button" 
                  onClick={() => sigPad.current?.clear()}
                  className="absolute top-2 right-2 bg-slate-100 text-slate-500 hover:text-rose-500 p-1.5 rounded-lg shadow-sm transition-colors text-xs flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Ulangi
                </button>
            </div>
            <p className="text-xs text-slate-400">Pastikan tanda tangan Anda sudah sesuai.</p>
          </div>

          <div className="pt-4 mt-2 border-t border-slate-100">
            <Button type="submit" disabled={submitting} className="w-full h-12 text-sm font-medium">
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mengirim...</>
              ) : (
                'Kirim Work Order'
              )}
            </Button>
          </div>
        </Card>
      </form>
      </>
      )}
      {activeWoTab === 'permintaan' && <CreateInternalTicketScreen inspectorName={inspectorName} inspectorNik={inspectorNik} onBack={() => {}} />}
      <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
    </div>
  );
}
