import { toast } from 'sonner';
import React, { useState, useEffect } from 'react';
import { Camera, Layers, CheckCircle2, ChevronRight, ChevronLeft, Wrench, Check, Image as ImageIcon, UploadCloud, Activity, X } from 'lucide-react';
import { Button, Card, Input, Textarea } from './ui';
import { PageHeader } from './PageHeader';
import { getEquipments, getEmployees, updateToolPhotoUrl, uploadPhotoToDrive, appendRowsToSheet, ToolRecord } from '../sheets-api';
import { DevModeAccordion, useDevOptions } from './dev-mode-accordion';
import { useInspection, ToolStatus, compressImage } from '../features/inspections/hooks/useInspection';




export function InspectionScreen({ inspectorName, equipmentCategories, reloadData, loading, inspectorNik }: { inspectorName: string, equipmentCategories: {category: string, tools: ToolRecord[]}[], reloadData: () => void, loading: boolean, inspectorNik: string }) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sectionGuideOpen, setSectionGuideOpen] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, ToolStatus>>(() => {
    try {
      const saved = localStorage.getItem('p2h_statuses_draft');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to load saved progress", e);
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('p2h_statuses_draft', JSON.stringify(statuses));
  }, [statuses]);

  const [saving, setSaving] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  
  const { devOptions, setDevOptions, parsedDevOptions } = useDevOptions(inspectorNik);
  
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  
  // Info Modal State
  const [photoUpdateUrl, setPhotoUpdateUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);

  // Helper
  const allTools = equipmentCategories.flatMap(c => c.tools);
  const currentTool = allTools.find(t => t.id === selectedToolId);

  const currentCategoryObj = equipmentCategories.find(c => c.category === activeCategory);
  const currentTools = currentCategoryObj?.tools || [];

  // Issue Form State
  const [issueType, setIssueType] = useState<'Minor Issue' | 'Breakdown'>('Minor Issue');
  const [minorChecklist, setMinorChecklist] = useState<string[]>([]);
  const [issueNotes, setIssueNotes] = useState('');
  const [issueTime, setIssueTime] = useState('');

  const handleSetGood = (id: string) => {
    setStatuses(prev => ({
      ...prev,
      [id]: { condition: 'Good', notes: '', breakdownTime: '', goodChecklist: ['Body Dalam Bersih', 'Body Luar Bersih', 'Kondisi Alat Aman', 'Electrical Aman'] }
    }));
  };

  const toggleGoodChecklist = (id: string, item: string) => {
    setStatuses(prev => {
       const existing = prev[id] || { condition: 'Good', notes: '', breakdownTime: '', goodChecklist: [] };
       let arr = existing.goodChecklist || [];
       if (arr.includes(item)) {
           arr = arr.filter(i => i !== item);
       } else {
           arr = [...arr, item];
       }
       return { ...prev, [id]: { ...existing, goodChecklist: arr } };
    });
  };

  const handleOpenIssue = (id: string) => {
    setSelectedToolId(id);
    const existing = statuses[id];
    setMinorChecklist([]); // Reset checklist on open
    if (existing && existing.condition !== 'Good') {
      setIssueType('Breakdown');
      
      let existingNotes = existing.notes || '';
      if (existingNotes.startsWith('[') && existingNotes.includes(']')) {
        const bracketEnd = existingNotes.indexOf(']');
        existingNotes = existingNotes.slice(bracketEnd + 1).trim();
        if (existingNotes.startsWith('- ')) existingNotes = existingNotes.slice(2);
      }
      
      setIssueNotes(existingNotes);
      setIssueTime(existing.breakdownTime || new Date().toISOString().slice(0,16));
    } else {
      setIssueType('Breakdown');
      setIssueNotes('');
      setIssueTime(new Date().toISOString().slice(0,16));
    }
    setIssueModalOpen(true);
  };

  const handleSaveIssue = () => {
    if (issueType === 'Breakdown' && !issueTime) return toast.error('Pilih estimasi waktu rusak!');
    if (!selectedToolId) return;

    let finalNotes = issueNotes;
    if (issueType === 'Minor Issue' && minorChecklist.length > 0) {
       finalNotes = `[${minorChecklist.join(', ')}] ${issueNotes ? '- ' + issueNotes : ''}`.trim();
    }

    setStatuses(prev => ({
      ...prev,
      [selectedToolId]: {
        condition: issueType,
        notes: finalNotes,
        breakdownTime: issueType === 'Breakdown' ? issueTime : ''
      }
    }));
    setIssueModalOpen(false);
  };

  const handleOpenInfo = (id: string) => {
    setSelectedToolId(id);
    const tool = allTools.find(t => t.id === id);
    setPhotoUpdateUrl(tool?.photoUrl || '');
    setImageFile(null);
    setInfoModalOpen(true);
  };

  const handleUpdatePhoto = async () => {
    if (!currentTool) return;
    try {
      setSavingPhoto(true);
      
      let finalUrl = photoUpdateUrl;
      
      if (imageFile) {
        const compressedBase64 = await compressImage(imageFile);
        const base64Data = compressedBase64.split(',')[1];
        finalUrl = await uploadPhotoToDrive(base64Data, imageFile.type, imageFile.name, 'Inspeksi Harian');
      }

      if (!finalUrl) throw new Error("File atau URL tidak valid");

      await updateToolPhotoUrl(currentTool.sheetOrigin, currentTool.rowIndex, finalUrl);
      toast.success('Foto Alat berhasil diperbarui!');
      reloadData();
      setInfoModalOpen(false);
      setImageFile(null);
      setPhotoUpdateUrl('');
    } catch(err: any) {
      toast.error('Gagal mengupload foto: ' + err.message);
    } finally {
      setSavingPhoto(false);
    }
  };

  const isComplete = currentTools.length > 0 && currentTools.every(t => statuses[t.id]?.condition);
  const progress = currentTools.length === 0 ? 0 : Math.round((currentTools.filter(t => statuses[t.id]?.condition).length / currentTools.length) * 100);

  const handleSubmit = async () => {
    if (!isComplete) return toast.error('Silakan selesaikan pengecekan semua alat pada section ini terlebih dahulu.');
    if (saving) return;
    try {
      setSaving(true);
      const timestamp = new Date().toISOString();
      
      const inspectionRows: any[][] = [];
      const downtimeRows: any[][] = [];

      for (const tool of currentTools) {
        const s = statuses[tool.id];
        const notesStr = s.goodChecklist && s.goodChecklist.length > 0 ? `[${s.goodChecklist.join(', ')}] ` + s.notes : s.notes;
        inspectionRows.push([timestamp, tool.name, s.condition, inspectorName, notesStr]);

        if (s.condition === 'Breakdown') {
          const dtId = crypto.randomUUID();
          const bTimeIso = new Date(s.breakdownTime).toISOString();
          downtimeRows.push([dtId, tool.name, bTimeIso, '', s.notes, 'Breakdown']);
        }
      }

      await appendRowsToSheet('Inspections', inspectionRows, parsedDevOptions);
      if (downtimeRows.length > 0) {
        await appendRowsToSheet('Downtime', downtimeRows, parsedDevOptions);
      }

      toast.success(`Laporan inspeksi section ${activeCategory} sukses direkam!`);
      
      setStatuses(prev => {
        const next = { ...prev };
        currentTools.forEach(t => delete next[t.id]);
        return next;
      });
      setActiveCategory(null);
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectCategory = (category: string) => {
    setActiveCategory(category);
    const catObj = equipmentCategories.find(c => c.category === category);
    if (catObj) {
      const isStarted = catObj.tools.some(t => statuses[t.id]?.condition);
      if (!isStarted) setSectionGuideOpen(true);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 md:max-w-2xl md:mx-auto">
      <PageHeader 
        title="Checklist Harian"
        description={`Hello, ${inspectorName}`}
        icon={<Activity />}
      />
      
      {activeCategory && (
        <div className="flex justify-end px-1 -mt-2 mb-4">
          <div className="bg-teal-50 border border-teal-100 px-4 py-2 rounded-xl flex flex-col items-end shadow-sm">
            <span className="text-xs text-teal-600 font-semibold uppercase tracking-wide">Progress</span>
            <span className="text-2xl font-display font-bold text-teal-700 leading-none mt-1">{progress}%</span>
          </div>
        </div>
      )}

      <DevModeAccordion inspectorNik={inspectorNik} devOptions={devOptions} setDevOptions={setDevOptions} />

      {loading ? (
         <div className="flex justify-center p-8"><Activity className="animate-spin text-teal-600 w-8 h-8" /></div>
      ) : equipmentCategories.length === 0 ? (
         <Card className="text-center text-sm p-8 text-slate-500">
            Database alat belum tersedia. <br/>Pastikan Spreadsheet memilki sheet <b>data_Alat_Prep_Basah</b>, <b>data_Alat_Prep_Kering</b>, dsb dengan format kolom yang benar dan sudah ditautkan dengan valid GAS API.
         </Card>
      ) : activeCategory === null ? (
        <div className="space-y-4 pb-6 mt-6">
          <h3 className="text-lg font-medium text-slate-800 tracking-tight">Pilih Section Inspeksi</h3>
          {equipmentCategories.map((cat, idx) => {
             const checkedCount = cat.tools.filter(t => statuses[t.id]?.condition).length;
             const isDone = checkedCount > 0 && checkedCount === cat.tools.length;
             return (
               <Card key={`${cat.category}-${idx}`} className="cursor-pointer hover:border-teal-400 hover:shadow-md transition-all group overflow-hidden relative" onClick={() => handleSelectCategory(cat.category)}>
                  <div className="flex items-center gap-4 relative z-10">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDone ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-500 group-hover:bg-teal-50 group-hover:text-teal-500'} transition-colors`}>
                      <Layers className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-700">{cat.category}</div>
                      <div className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1.5">
                        {isDone && <CheckCircle2 className="w-4 h-4 text-teal-500" />}
                        {checkedCount} / {cat.tools.length} Peralatan
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-teal-400 transition-colors" />
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-4 relative z-10">
                    <div className="bg-teal-500 h-1.5 rounded-full transition-all" style={{ width: `${(checkedCount / cat.tools.length) * 100}%` }}></div>
                  </div>
               </Card>
             );
          })}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setActiveCategory(null)} className="p-2 -ml-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-600">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-sm font-semibold text-slate-600 tracking-wide uppercase">{activeCategory}</h3>
          </div>

          <div className="w-full bg-slate-200 rounded-full h-1.5 mb-2">
            <div className="bg-teal-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
          </div>

          <div className="space-y-6 pb-6 mt-4">
            {Object.entries(
              currentTools.reduce((acc, tool) => {
                const cat = tool.itemCategory || 'Lainnya';
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(tool);
                return acc;
              }, {} as Record<string, ToolRecord[]>)
            ).map(([categoryName, tools]) => (
              <div key={categoryName} className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-700 border-b border-slate-200 pb-2 px-1">{categoryName}</h4>
                {tools.map((tool, tIdx) => {
                  const s = statuses[tool.id];
                  const isChecklist = categoryName === 'Alat & Instrument';
                  
                  if (isChecklist) {
                    const isGood = s?.condition === 'Good';
                    const isIssue = s?.condition === 'Minor Issue' || s?.condition === 'Breakdown';
                    return (
                      <div key={`${tool.id}-${tIdx}`} className="flex flex-col p-4 bg-white border border-slate-200 rounded-2xl shadow-sm transition-all hover:border-slate-300 gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1 cursor-pointer" onClick={() => handleOpenInfo(tool.id)}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-700">
                                {tool.name}
                                {tool.location && (
                                  <span className="text-slate-400 font-normal text-xs ml-2">
                                    • {tool.location}
                                  </span>
                                )}
                              </span>
                              <ChevronRight className="w-4 h-4 text-slate-300" />
                            </div>
                            {isIssue && (
                              <div className="text-xs text-rose-500 mt-1.5 font-medium bg-rose-50 inline-block px-2 py-0.5 rounded">
                                {s.condition}: {s.notes.substring(0, 30)}{s.notes.length > 30 ? '...' : ''}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button 
                              onClick={() => handleSetGood(tool.id)}
                              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isGood ? 'bg-teal-500 text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                            >
                              <Check className="w-6 h-6" />
                            </button>
                            <button 
                              onClick={() => handleOpenIssue(tool.id)}
                              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isIssue ? 'bg-rose-500 text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                            >
                              <Wrench className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        {isGood && (
                          <div className="pt-3 mt-1 border-t border-slate-100 animate-in slide-in-from-top-2 fade-in">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Pengecekan Rutin (P2H)</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {['Body Dalam Bersih', 'Body Luar Bersih', 'Kondisi Alat Aman', 'Electrical Aman'].map(item => (
                                <label key={item} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                                  <input 
                                    type="checkbox" 
                                    className="w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 bg-white"
                                    checked={(s.goodChecklist || []).includes(item)}
                                    onChange={() => toggleGoodChecklist(tool.id, item)}
                                  />
                                  <span className="text-sm font-medium text-slate-700">{item}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    return (
                      <div key={`${tool.id}-${tIdx}`} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl shadow-sm transition-all hover:border-slate-300 gap-4">
                        <div className="flex-1 cursor-pointer" onClick={() => handleOpenInfo(tool.id)}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-700">
                              {tool.name}
                              {tool.location && (
                                <span className="text-slate-400 font-normal text-xs ml-2">
                                  • {tool.location}
                                </span>
                              )}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-300" />
                          </div>
                        </div>
                        <div className="w-32 shrink-0">
                          <Input 
                            type="number"
                            min="0"
                            placeholder="Jumlah"
                            className="text-center font-semibold"
                            value={s?.condition?.replace('Jumlah: ', '') || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (!val) {
                                setStatuses(prev => {
                                  const next = { ...prev };
                                  delete next[tool.id];
                                  return next;
                                });
                              } else {
                                setStatuses(prev => ({
                                  ...prev,
                                  [tool.id]: { condition: `Jumlah: ${val}`, notes: s?.notes || '', breakdownTime: '' }
                                }));
                              }
                            }}
                          />
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            ))}
          </div>
          <Button onClick={handleSubmit} disabled={saving || !isComplete || loading} className={!isComplete ? 'opacity-50' : ''}>
            {saving ? 'Mengirim Data...' : `Kirim Laporan Section`}
          </Button>
        </>
      )}

      {/* ISSUE MODAL */}
      {issueModalOpen && selectedToolId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-300 max-h-[90vh] overflow-y-auto">
            <h3 className="font-display font-semibold text-xl text-slate-800 mb-1">
              Catatan Kerusakan
            </h3>
            <p className="text-sm text-slate-500 mb-6 font-medium">{currentTool?.name}</p>
            
            <div className="space-y-5">
              <div className="bg-rose-50 border border-rose-200 text-rose-700 py-3 text-center rounded-xl font-semibold tracking-wide shadow-sm">
                 BREAKDOWN / KENDALA
              </div>

              <Input 
                type="datetime-local" 
                label="Waktu Alat Rusak" 
                value={issueTime}
                onChange={e => setIssueTime(e.target.value)}
              />

              <Textarea 
                label={"Keterangan Ringkas"} 
                placeholder="Deskripsi lebih lanjut..."
                rows={3}
                value={issueNotes}
                onChange={e => setIssueNotes(e.target.value)}
              />

              <div className="flex gap-3 pt-2">
                <Button variant="secondary" onClick={() => setIssueModalOpen(false)}>Batal</Button>
                <Button variant="primary" onClick={handleSaveIssue}>Simpan Catatan</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INFO MODAL */}
      {infoModalOpen && currentTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative flex flex-col max-h-[90vh]">
            <button onClick={() => setInfoModalOpen(false)} className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors">
              <X className="w-5 h-5"/>
            </button>
            <div className="overflow-y-auto flex-1">
              <div className="h-48 bg-slate-100 flex items-center justify-center relative overflow-hidden shrink-0">
                {currentTool.photoUrl ? (
                  <img src={currentTool.photoUrl} alt="Tool" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-slate-400">
                    <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <span className="text-xs font-medium">Belum ada foto</span>
                  </div>
                )}
              </div>
              
              <div className="p-6 space-y-4 pb-8">
              <div>
                <h3 className="font-display font-semibold text-xl text-slate-800">{currentTool.name}</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold bg-slate-100 inline-block px-2 py-0.5 rounded">Nomor Asset: {currentTool.assetNumber || '-'}</span>
                  {currentTool.location && (
                     <span className="text-[10px] text-teal-600 uppercase tracking-wider font-semibold bg-teal-50 border border-teal-100 inline-block px-2 py-0.5 rounded">LOKASI: {currentTool.location}</span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mt-3 leading-relaxed border-l-2 border-teal-500 pl-3 bg-teal-50/50 py-1">{currentTool.description || 'Tidak ada deskripsi/spesifikasi khusus.'}</p>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Upload Foto Baru</label>
                  <label className="flex items-center justify-center w-full min-h-[80px] p-4 font-medium text-sm text-slate-500 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors text-center">
                    <span className="flex flex-col items-center gap-1">
                      <UploadCloud className="w-5 h-5 text-teal-500" />
                      {imageFile ? imageFile.name : 'Pilih File Gambar'}
                    </span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setImageFile(e.target.files[0]);
                      }
                    }} />
                  </label>
                </div>
                
                <Button variant="secondary" onClick={handleUpdatePhoto} disabled={savingPhoto || !imageFile}>
                  <Camera className="w-4 h-4"/> {savingPhoto ? 'Menyimpan...' : 'Upload & Simpan Foto'}
                </Button>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}
      
      {/* SECTION GUIDE MODAL */}
      {sectionGuideOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="font-display font-semibold text-xl text-slate-800 mb-2">Cara Pengisian Form</h3>
            <div className="space-y-4 text-sm text-slate-600 mb-6 mt-4 leading-relaxed">
              <p className="flex items-start gap-3 border-l-2 border-teal-500 pl-3">
                 <span>Isi <b>Checklist (✓)</b> apabila:<br/>Body Dalam & Luar Bersih<br/>Kondisi Alat & Kelistrikan Normal.</span>
              </p>
              <p className="flex items-start gap-3 border-l-2 border-rose-500 pl-3">
                 <span>Jika <b>Ada Masalah/Breakdown</b>:<br/>Klik ikon <b>(🔧)</b> dan pilih kriteria kendala serta berikan keterangan spesifik.</span>
              </p>
            </div>
            <Button variant="primary" onClick={() => setSectionGuideOpen(false)} className="w-full">
              Mengerti, Mulai Inspeksi
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
