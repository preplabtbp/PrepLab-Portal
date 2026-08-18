

import React, { useState } from 'react';
import { Card, Button, Textarea, Input } from './ui';
import { Loader2, Wrench, CheckCircle2, Clock, Users, X, PlusCircle , ClipboardList } from 'lucide-react';
import { ImageModal } from './image-modal';
import { WhatsAppModal } from './whatsapp-modal';
import { DevModeAccordion, useDevOptions } from './dev-mode-accordion';
import { useWorkOrders } from '../features/work-orders/hooks/useWorkOrders';
import { useWorkOrderResolution } from '../features/work-orders/hooks/useWorkOrderResolution';
import { PageHeader } from './PageHeader';

export function WOListScreen({ inspectorName, inspectorNik }: { inspectorName: string, inspectorNik: string }) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'wo' | 'ticket'>('wo');
  const { devOptions, setDevOptions, parsedDevOptions } = useDevOptions(inspectorNik);

  const { woData, ticketData, sparepartsList, employees, loading, loadData } = useWorkOrders();

  const {
    resolutionPhoto, setResolutionPhoto,
    resolvingId, setResolvingId,
    resolveNotes, setResolveNotes,
    useSparepart, setUseSparepart,
    spareparts, setSpareparts,
    selectedTechs, setSelectedTechs,
    techSearch, setTechSearch,
    waMessageToModal, setWaMessageToModal,
    isResolving,
    handleResolvePermintaan,
    handleResolveWO,
    resetForm
  } = useWorkOrderResolution(inspectorName, parsedDevOptions, loadData);
  const getStatusColor = (status: string) => {
    if (status === 'Closed' || status === 'Resolved') return 'bg-teal-100 text-teal-700 border-teal-200';
    if (status === 'In Progress') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-rose-100 text-rose-700 border-rose-200'; // Open
  };

  
  const handleRekapHarian = () => {
     let text = '==== REKAPAN TEMUAN HARIAN ====\n\n';
     text += `Tanggal: ${new Date().toLocaleDateString('id-ID')}\n\n`;
     
     const openWOs = woData.filter((w: any) => w.status === 'Open');
     text += `*WO KERUSAKAN (${openWOs.length} Open)*\n`;
     if (openWOs.length === 0) text += `- Nihil\n`;
     openWOs.forEach((w: any, idx: number) => {
        text += `${idx+1}. [${w.woId}] ${w.equipmentName} - ${w.issueDescription}\n`;
     });
     
     text += `\n*WO PERMINTAAN (${ticketData.length} Open)*\n`;
     if (ticketData.length === 0) text += `- Nihil\n`;
     ticketData.forEach((w: any, idx: number) => {
        text += `${idx+1}. [${w.ticketId}] ${w.category} (${w.location}) - ${w.description}\n`;
     });
     
     setWaMessageToModal(text);
  };

  const formatTanggal = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const isCompleted = (status: string) => status === 'Closed' || status === 'Resolved';

  if (loading && woData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
         <Loader2 className="w-8 h-8 text-teal-500 animate-spin mb-4" />
         <p className="text-slate-500 font-medium">Memuat Data WO...</p>
      </div>
    );
  }

  // Sort WOData (Open at top, Closed at bottom, recent first if possible)
  const sortedWoData = [...woData].reverse().sort((a, b) => {
     const statusA = isCompleted(a.status) ? 1 : 0;
     const statusB = isCompleted(b.status) ? 1 : 0;
     return statusA - statusB;
  });

  const sortedPermintaanData = [...ticketData].reverse().sort((a, b) => { const statusA = isCompleted(a.status) ? 1 : 0; const statusB = isCompleted(b.status) ? 1 : 0; return statusA - statusB; });
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <PageHeader 
        title="Daftar Work Order"
        description="Status penyelesaian WO kerusakan & permintaan"
        icon={<ClipboardList />}
      >
        <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-0">
          <Button onClick={handleRekapHarian} className="h-9 bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 text-xs border-0">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
            Rekapan Harian
          </Button>
          <Button onClick={() => loadData()} variant="secondary" className="h-9 bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-md">Refresh Data</Button>
        </div>
      </PageHeader>

      <DevModeAccordion inspectorNik={inspectorNik} devOptions={devOptions} setDevOptions={setDevOptions} />

      <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
        <button 
          onClick={() => setActiveTab('wo')}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'wo' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
        >
          WO Perbaikan
        </button>
        <button 
          onClick={() => setActiveTab('ticket')}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'ticket' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
        >
          WO Permintaan
        </button>
      </div>


      <div className="space-y-4 md:grid md:grid-cols-2 md:gap-6 md:space-y-0 lg:grid-cols-3">
        {activeTab === 'wo' ? sortedWoData.length === 0 ? (
          <Card className="text-center py-10 border-dashed border-2 border-slate-200 bg-slate-50">
             <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm text-slate-400 mb-4">
                <CheckCircle2 className="w-8 h-8" />
             </div>
             <h3 className="text-slate-700 font-medium font-display">Belum ada WO</h3>
             <p className="text-slate-500 text-sm mt-1">Tidak ada Work Order yang aktif saat ini.</p>
          </Card>
        ) : (
          sortedWoData.map((wo: any, idx: number) => (
            <Card key={idx} className={`border-l-4 ${isCompleted(wo.status) ? 'border-l-teal-400' : 'border-l-rose-400'} relative overflow-hidden group`}>
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      {wo.woId}
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getStatusColor(wo.status)}`}>
                      {wo.status || 'Open'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-800 text-lg">{wo.equipmentName}</h3>
                  <div className="text-sm text-slate-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {new Date(wo.date).toLocaleString('id-ID')}</span>
                    <span><span className="font-medium text-slate-600">ID Alat:</span> {wo.equipmentCode}</span>
                    {wo.location && <span><span className="font-medium text-slate-600">Lokasi:</span> {wo.location.replace(/^(- - |- )\s*/, '')}</span>}
                  </div>
                  
                  <div className="mt-4 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="font-medium text-slate-700 mb-1">Deskripsi Kerusakan:</div>
                    <p className="text-slate-600">{wo.issueDescription || '-'}</p>
                  </div>
                  
                  {(wo.photoUrl || wo.pdfUrl) && (
                    <div className="mt-3 flex gap-4 items-center">
                       {wo.photoUrl && (
                         <button type="button" onClick={() => setSelectedImage(wo.photoUrl)} className="text-teal-600 text-xs font-medium hover:underline inline-flex items-center gap-1">
                           Lihat Foto Bukti &rarr;
                         </button>
                       )}
                       {wo.pdfUrl && (
                         <a href={wo.pdfUrl} target="_blank" rel="noreferrer" className="text-rose-600 text-xs font-medium hover:underline inline-flex items-center gap-1">
                           📄 Download PDF WO
                         </a>
                       )}
                    </div>
                  )}

                  {isCompleted(wo.status) && wo.actionTaken && (
                    <div className="mt-3 text-sm bg-teal-50 p-3 rounded-lg border border-teal-100">
                      <div className="font-medium text-teal-800 mb-1">Catatan Penyelesaian:</div>
                      <p className="text-teal-700">{wo.actionTaken}</p>
                      
                      {wo.sparepartName && wo.sparepartName !== '-' && (
                        <div className="mt-2 text-xs bg-white/50 px-2 py-1.5 rounded border border-teal-100/50 inline-block font-medium text-teal-800">
                          ⚙️ Sparepart: {wo.sparepartName} <span className="text-teal-600">(Qty: {wo.sparepartQty || 1})</span>
                        </div>
                      )}

                      <div className="text-xs text-teal-600 mt-2 font-medium flex items-center gap-2">
                        <span>Teknisi: {wo.technicianPic || '-'}</span>
                        {wo.repairEnd && <span>• Selesai pada: {new Date(wo.repairEnd).toLocaleString('id-ID')}</span>}
                      </div>
                    </div>
                  )}
                </div>

                {!isCompleted(wo.status) && resolvingId !== wo.woId && (
                  <div className="flex items-end md:items-start shrink-0">
                    <Button onClick={() => setResolvingId(wo.woId)} className="bg-teal-500 hover:bg-teal-600 w-full md:w-auto">
                      <Wrench className="w-4 h-4 mr-2" /> Selesaikan
                    </Button>
                  </div>
                )}
              </div>

              {resolvingId === wo.woId && (
                <div className="mt-4 pt-4 border-t border-slate-200 animate-in fade-in slide-in-from-top-2">
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2 whitespace-nowrap">Bukti Penyelesaian (Wajib)</label>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center justify-center px-4 py-2 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer">
                         <span className="truncate max-w-[150px]">{resolutionPhoto ? 'Foto Dipilih' : 'Upload Foto'}</span>
                         <input type="file" className="sr-only" accept="image/*" onChange={(e) => {
                           const file = e.target.files?.[0];
                           if (file) {
                             const reader = new FileReader();
                             reader.onloadend = () => setResolutionPhoto(reader.result as string);
                             reader.readAsDataURL(file);
                           }
                         }} />
                      </label>
                      {resolutionPhoto && (
                         <div className="relative w-16 h-16 rounded overflow-hidden border border-slate-200">
                           <img src={resolutionPhoto} alt="Preview" className="w-full h-full object-cover" />
                           <button type="button" onClick={() => setResolutionPhoto('')} className="absolute top-0 right-0 bg-black/50 text-white p-0.5 hover:bg-red-500">
                              <X className="w-3 h-3" />
                           </button>
                         </div>
                      )}
                    </div>
                  </div>
                  <Textarea 
                    label="Catatan Penyelesaian (Hasil Tindakan)"
                    placeholder="Contoh: Mengganti bearing, membersihkan filter, update setting..."
                    value={resolveNotes}
                    onChange={(e) => setResolveNotes(e.target.value)}
                    required
                  />

                    <div className="mt-4 border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <label className="block text-sm font-medium text-slate-700 mb-2 whitespace-nowrap"><Users className="w-4 h-4 inline mr-1 text-teal-600"/> Personil yang Mengerjakan</label>
                      <div className="space-y-3">
                        <div className="relative">
                           <input 
                              list="employees-list"
                              type="text"
                              value={techSearch}
                              onChange={(e) => {
                                 setTechSearch(e.target.value);
                                 const match = employees.find(emp => emp.nama === e.target.value || `${emp.nik} - ${emp.nama}` === e.target.value);
                                 if (match && !selectedTechs.some(t => t.nik === match.nik)) {
                                   setSelectedTechs([...selectedTechs, match]);
                                   setTechSearch('');
                                 }
                              }}
                              placeholder="Ketik nama karyawan..."
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white shadow-sm"
                           />
                           <datalist id="employees-list">
                             {employees.map(emp => (
                               <option key={emp.nik} value={`${emp.nik} - ${emp.nama}`} />
                             ))}
                           </datalist>
                        </div>
                        {selectedTechs.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                             {selectedTechs.map(tech => (
                               <div key={tech.nik} className="flex items-center gap-1 bg-teal-100 text-teal-800 px-2.5 py-1 rounded-md text-xs font-semibold">
                                 {tech.nama}
                                 <button type="button" onClick={() => setSelectedTechs(selectedTechs.filter(t => t.nik !== tech.nik))} className="hover:text-rose-500 transition-colors ml-1 inline-flex items-center justify-center">
                                   <X className="w-3.5 h-3.5" />
                                 </button>
                               </div>
                             ))}
                          </div>
                        )}
                        {selectedTechs.length === 0 && (
                          <p className="text-xs text-slate-500">Secara default, jika dikosongkan akan menggunakan nama Anda: <span className="font-semibold">{inspectorName}</span>.</p>
                        )}
                      </div>
                    </div>

                  <div className="mt-4 border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <label className="flex items-center gap-3 cursor-pointer p-1">
                      <input 
                        type="checkbox" 
                        checked={useSparepart} 
                        onChange={(e) => setUseSparepart(e.target.checked)}
                        className="w-5 h-5 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                      />
                      <span className="font-medium text-slate-700">Penggunaan Sparepart</span>
                    </label>

                    {useSparepart && (
                      <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                        {spareparts.map((sp, idx) => (
                          <div key={idx} className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 space-y-1">
                              <label className="block text-xs font-medium text-slate-700">Nama Sparepart</label>
                              <input 
                                list="sparepart-list"
                                type="text"
                                value={sp.name}
                                onChange={(e) => {
                                  const newSp = [...spareparts];
                                  newSp[idx].name = e.target.value;
                                  setSpareparts(newSp);
                                }}
                                placeholder="Ketik untuk mencari atau tambah baru"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white shadow-sm"
                                required
                              />
                            {sp.name && !sparepartsList.includes(sp.name) && (
                                <p className="text-xs text-rose-500 mt-1">Item tidak valid (tidak ada di database)</p>
                              )}
                            </div>
                            <div className="w-full sm:w-24 space-y-1 shrink-0">
                              <label className="block text-xs font-medium text-slate-700">Jumlah</label>
                              <div className="flex gap-2 relative">
                                <input 
                                  type="number"
                                  min="1"
                                  value={sp.qty}
                                  onChange={(e) => {
                                    const newSp = [...spareparts];
                                    newSp[idx].qty = e.target.value;
                                    setSpareparts(newSp);
                                  }}
                                  placeholder="1"
                                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white shadow-sm"
                                  required
                                />
                                {sp.name && !sp.qty && (
                                  <p className="absolute -bottom-4 left-0 text-[10px] text-rose-500 whitespace-nowrap">Wajib diisi</p>
                                )}
                                {spareparts.length > 1 && (
                                  <button type="button" onClick={() => setSpareparts(spareparts.filter((_, i) => i !== idx))} className="shrink-0 p-2 text-rose-500 hover:bg-rose-50 rounded-lg self-end">
                                    <X className="w-5 h-5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        <button type="button" onClick={() => setSpareparts([...spareparts, {name: '', qty: ''}])} className="text-sm text-teal-600 font-medium hover:text-teal-700 flex items-center gap-1 mt-1">
                          <PlusCircle className="w-4 h-4" /> Tambah Sparepart
                        </button>
                        <datalist id="sparepart-list">
                          {sparepartsList.map((spItem, idxList) => (
                            <option key={idxList} value={spItem} />
                          ))}
                        </datalist>
                      </div>
                    )}
                  </div>

                                                      {isResolving && (
                    <div className="mb-4 space-y-2 px-2 mt-4 animate-in fade-in slide-in-from-bottom-2">
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 w-1/2 rounded-full animate-pulse" />
                      </div>
                      <p className="text-xs text-teal-600 text-center font-medium animate-pulse">Menyimpan dan mengunggah bukti penyelesaian...</p>
                    </div>
                  )}
                  <div className="flex gap-2 justify-end mt-5">
                    <Button variant="secondary" onClick={() => { 
                      setResolvingId(null); 
                      setResolveNotes(''); 
                      setUseSparepart(false); 
                      setSelectedTechs([]);
                      setTechSearch('');
                    }}>
                      Batal
                    </Button>
                    <Button 
                      onClick={() => handleResolveWO(wo.woId)} 
                      disabled={!resolutionPhoto || !resolveNotes.trim() || loading || (useSparepart && spareparts.some(sp => !sp.name.trim() || !sp.qty || !sparepartsList.includes(sp.name)))}
                      className="bg-teal-500 hover:bg-teal-600"
                    >
                      {isResolving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                      Selesai
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))
        ) : null}
      
        {activeTab === 'ticket' && sortedPermintaanData.length === 0 ? (
          <Card className="text-center py-10 border-dashed border-2 border-slate-200 bg-slate-50">
             <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm text-slate-400 mb-4">
                <CheckCircle2 className="w-8 h-8" />
             </div>
             <h3 className="text-lg font-semibold text-slate-800">Tidak ada WO Permintaan</h3>
             <p className="text-sm text-slate-500 max-w-sm mx-auto mt-2">Belum ada request yang perlu diselesaikan.</p>
          </Card>
        ) : null}

        {activeTab === 'ticket' && sortedPermintaanData.map((ticket, index) => (
            <Card key={index} className={`p-4 ${isCompleted(ticket.status) ? 'opacity-70 bg-slate-50' : 'bg-white'} border-l-4 ${isCompleted(ticket.status) ? 'border-l-slate-300' : 'border-l-purple-500'}`}>
              <div className="flex flex-col md:flex-row gap-4 justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{ticket.ticketId}</span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${getStatusColor(ticket.status)}`}>
                          {ticket.status}
                        </span>
                        {ticket.priority === 'High' && (
                           <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border border-rose-200 bg-rose-100 text-rose-700">Urgent</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-slate-800 text-lg leading-tight mt-1">{ticket.category} - {ticket.location}</h3>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        <span><Clock className="w-3.5 h-3.5 inline mr-1 opacity-70"/> {formatTanggal(ticket.date)}</span>
                        <span>• Dilaporkan oleh: {ticket.requestorName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm text-slate-700">
                    <span className="font-semibold text-slate-800 block mb-1">Deskripsi Request:</span>
                    <p className="whitespace-pre-line leading-relaxed">{ticket.description || '-'}</p>
                    {ticket.targetDate && ticket.targetDate !== '-' && (
                      <p className="mt-2 text-xs text-rose-600 font-medium">⏳ Target Selesai: {formatTanggal(ticket.targetDate)}</p>
                    )}
                  </div>

                  {ticket.pdfUrl && (
                    <a href={ticket.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs text-rose-600 hover:text-rose-800 font-medium mt-1 mr-4">
                      📄 Download PDF WO
                    </a>
                  )}
                  {ticket.photoUrl && ticket.photoUrl !== '-' && (
                    <button type="button" onClick={() => setSelectedImage(ticket.photoUrl)} className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-800 font-medium mt-1">
                      📸 Lihat Referensi Foto
                    </button>
                  )}

                  {isCompleted(ticket.status) && (
                    <div className="bg-green-50 p-3 rounded-lg border border-green-100 mt-3">
                      <span className="font-semibold text-green-800 text-sm block mb-1 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4"/> Hasil Penyelesaian:</span>
                      <p className="text-sm text-green-900 whitespace-pre-line">{ticket.actionTaken || '-'}</p>
                      
                      {ticket.sparepartName && ticket.sparepartName !== '-' && (
                        <div className="mt-2 text-xs bg-white/50 px-2 py-1.5 rounded border border-green-200 inline-block font-medium text-green-800">
                          ⚙️ Sparepart: {ticket.sparepartName} <span className="text-green-600">(Qty: {ticket.sparepartQty || 1})</span>
                        </div>
                      )}
                      
                      <div className="text-xs text-green-700 mt-2 font-medium flex items-center gap-2">
                        <span>PIC: {ticket.pic || '-'}</span>
                        {ticket.completionDate && <span>• Selesai pada: {new Date(ticket.completionDate).toLocaleString('id-ID')}</span>}
                      </div>
                    </div>
                  )}
                </div>

                {!isCompleted(ticket.status) && resolvingId !== ticket.ticketId && (
                  <div className="flex items-end md:items-start shrink-0">
                    <Button onClick={() => setResolvingId(ticket.ticketId)} className="bg-purple-600 hover:bg-purple-700 w-full md:w-auto text-white">
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Tandai Selesai
                    </Button>
                  </div>
                )}
              </div>

              {resolvingId === ticket.ticketId && (
                <div className="mt-4 pt-4 border-t border-slate-200 animate-in fade-in slide-in-from-top-2">
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2 whitespace-nowrap">Bukti Penyelesaian (Wajib)</label>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center justify-center px-4 py-2 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer">
                         <span className="truncate max-w-[150px]">{resolutionPhoto ? 'Foto Dipilih' : 'Upload Foto'}</span>
                         <input type="file" className="sr-only" accept="image/*" onChange={(e) => {
                           const file = e.target.files?.[0];
                           if (file) {
                             const reader = new FileReader();
                             reader.onloadend = () => setResolutionPhoto(reader.result as string);
                             reader.readAsDataURL(file);
                           }
                         }} />
                      </label>
                      {resolutionPhoto && (
                         <div className="relative w-16 h-16 rounded overflow-hidden border border-slate-200">
                           <img src={resolutionPhoto} alt="Preview" className="w-full h-full object-cover" />
                           <button type="button" onClick={() => setResolutionPhoto('')} className="absolute top-0 right-0 bg-black/50 text-white p-0.5 hover:bg-red-500">
                              <X className="w-3 h-3" />
                           </button>
                         </div>
                      )}
                    </div>
                  </div>
                  <Textarea 
                    label="Catatan Penyelesaian (Hasil Tindakan)"
                    placeholder="Contoh: Modifikasi rack selesai, pembuatan meja tuntas..."
                    value={resolveNotes}
                    onChange={(e) => setResolveNotes(e.target.value)}
                    required
                  />
                  
                  <div className="mt-4 border border-slate-200 rounded-xl p-4 bg-slate-50">
                      <label className="block text-sm font-medium text-slate-700 mb-2 whitespace-nowrap"><Users className="w-4 h-4 inline mr-1 text-purple-600"/> Personil yang Mengerjakan</label>
                      <div className="space-y-3">
                        <div className="relative">
                           <input 
                              list="employees-list"
                              type="text"
                              value={techSearch}
                              onChange={(e) => {
                                 setTechSearch(e.target.value);
                                 const match = employees.find(emp => emp.nama === e.target.value || `${emp.nik} - ${emp.nama}` === e.target.value);
                                 if (match && !selectedTechs.some(t => t.nik === match.nik)) {
                                   setSelectedTechs([...selectedTechs, match]);
                                   setTechSearch('');
                                 }
                              }}
                              placeholder="Ketik nama karyawan..."
                              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white shadow-sm"
                           />
                           <datalist id="employees-list">
                             {employees.map(emp => (
                               <option key={emp.nik} value={`${emp.nik} - ${emp.nama}`} />
                             ))}
                           </datalist>
                        </div>
                        {selectedTechs.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                             {selectedTechs.map(tech => (
                               <div key={tech.nik} className="flex items-center gap-1 bg-purple-100 text-purple-800 px-2.5 py-1 rounded-md text-xs font-semibold">
                                 {tech.nama}
                                 <button type="button" onClick={() => setSelectedTechs(selectedTechs.filter(t => t.nik !== tech.nik))} className="hover:text-rose-500 transition-colors ml-1 inline-flex items-center justify-center">
                                   <X className="w-3.5 h-3.5" />
                                 </button>
                               </div>
                             ))}
                          </div>
                        )}
                        {selectedTechs.length === 0 && (
                          <p className="text-xs text-slate-500">Secara default, jika dikosongkan akan menggunakan nama Anda: <span className="font-semibold">{inspectorName}</span>.</p>
                        )}
                      </div>
                    </div>

                  <div className="mt-4 border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <label className="flex items-center gap-3 cursor-pointer p-1">
                      <input 
                        type="checkbox" 
                        checked={useSparepart} 
                        onChange={(e) => setUseSparepart(e.target.checked)}
                        className="w-5 h-5 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                      />
                      <span className="font-medium text-slate-700">Penggunaan Sparepart</span>
                    </label>

                    {useSparepart && (
                      <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                        {spareparts.map((sp, idx) => (
                          <div key={idx} className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 space-y-1">
                              <label className="block text-xs font-medium text-slate-700">Nama Sparepart</label>
                              <input 
                                list="sparepart-list"
                                type="text"
                                value={sp.name}
                                onChange={(e) => {
                                  const newSp = [...spareparts];
                                  newSp[idx].name = e.target.value;
                                  setSpareparts(newSp);
                                }}
                                placeholder="Ketik untuk mencari atau tambah baru"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white shadow-sm"
                                required
                              />
                            {sp.name && !sparepartsList.includes(sp.name) && (
                                <p className="text-xs text-rose-500 mt-1">Item tidak valid (tidak ada di database)</p>
                              )}
                            </div>
                            <div className="w-full sm:w-24 space-y-1 shrink-0">
                              <label className="block text-xs font-medium text-slate-700">Jumlah</label>
                              <div className="flex gap-2 relative">
                                <input 
                                  type="number"
                                  min="1"
                                  value={sp.qty}
                                  onChange={(e) => {
                                    const newSp = [...spareparts];
                                    newSp[idx].qty = e.target.value;
                                    setSpareparts(newSp);
                                  }}
                                  placeholder="1"
                                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white shadow-sm"
                                  required
                                />
                                {sp.name && !sp.qty && (
                                  <p className="absolute -bottom-4 left-0 text-[10px] text-rose-500 whitespace-nowrap">Wajib diisi</p>
                                )}
                                {spareparts.length > 1 && (
                                  <button type="button" onClick={() => setSpareparts(spareparts.filter((_, i) => i !== idx))} className="shrink-0 p-2 text-rose-500 hover:bg-rose-50 rounded-lg self-end">
                                    <X className="w-5 h-5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        <button type="button" onClick={() => setSpareparts([...spareparts, {name: '', qty: ''}])} className="text-sm text-purple-600 font-medium hover:text-purple-700 flex items-center gap-1 mt-1">
                          <PlusCircle className="w-4 h-4" /> Tambah Sparepart
                        </button>
                        <datalist id="sparepart-list">
                          {sparepartsList.map((spItem, idxList) => (
                            <option key={idxList} value={spItem} />
                          ))}
                        </datalist>
                      </div>
                    )}
                  </div>

                  {isResolving && (
                    <div className="mb-4 space-y-2 px-2 mt-4 animate-in fade-in slide-in-from-bottom-2">
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 w-1/2 rounded-full animate-pulse" />
                      </div>
                      <p className="text-xs text-purple-600 text-center font-medium animate-pulse">Menyimpan dan mengunggah bukti penyelesaian...</p>
                    </div>
                  )}
                  <div className="flex gap-2 justify-end mt-5">
                    <Button variant="secondary" onClick={() => { 
                      setResolvingId(null); 
                      setResolveNotes(''); 
                      setUseSparepart(false);
                      setSpareparts([{name: '', qty: ''}]);
                      setSelectedTechs([]);
                      setTechSearch('');
                    }}>
                      Batal
                    </Button>
                    <Button 
                      onClick={() => handleResolvePermintaan(ticket.ticketId)} 
                      disabled={!resolutionPhoto || !resolveNotes.trim() || loading || (useSparepart && spareparts.some(sp => !sp.name.trim() || !sp.qty || !sparepartsList.includes(sp.name)))}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {isResolving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                      Selesai
                    </Button>
                  </div>
                </div>
              )}
            </Card>
        ))}

      </div>
      <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />
      <WhatsAppModal 
        isOpen={!!waMessageToModal} 
        onClose={() => setWaMessageToModal('')} 
        messageText={waMessageToModal} 
        title="Laporan Berhasil" 
        description="Berhasil ditutup. Kirim laporan ke WhatsApp?" 
      />
    </div>
  );
}
