import { CreateInternalTicketScreen } from './create-internal-ticket-screen';
import React, { useState, useRef } from 'react';
import { Card, Input, Select, Textarea, Button } from './ui';
import { appendRowsToSheet, ToolRecord, uploadPhotoToDrive} from '../sheets-api';
import { CheckCircle2, Loader2, Image as ImageIcon, UploadCloud, RotateCcw , PlusCircle } from 'lucide-react';
import { ImageModal } from './image-modal';
import { DevModeAccordion, useDevOptions } from './dev-mode-accordion';
import { WhatsAppModal } from './whatsapp-modal';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'sonner';
import { workOrderSchema } from '../lib/zod';
import { PageHeader } from './PageHeader';

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
  
  
  const [activeWoTab, setActiveWoTab] = useState<'kerusakan' | 'permintaan'>('kerusakan');

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [waMessageText, setWaMessageText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedTool, setSelectedTool] = useState<ToolRecord | null>(null);
  
  const sigPad = useRef<any>(null);

  const { devOptions, setDevOptions, parsedDevOptions } = useDevOptions(inspectorNik);

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
        toolId = selectedTool ? selectedTool.id : '-';
        toolName = selectedTool ? selectedTool.name : (formData.toolSearch.split(' - ')[0] || formData.toolSearch || '-');
      } else {
        toolName = formData.toolNameManual;
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
              }}
              options={[
                {value: "Instrument", label: "Instrument"},
                {value: "Non-Instrument", label: "Non-Instrument"}
              ]}
            />
          </div>

          <div className="space-y-2 relative">
            <label className="block text-sm font-medium text-slate-700">
              {formData.tipeWO === 'Instrument' ? 'Cari Alat Rusak' : 'Nama Mesin / Asset Rusak'}
            </label>
            
            {formData.tipeWO === 'Instrument' ? (
              <>
                <input 
                  list="tools-list"
                  type="text"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-white shadow-sm"
                  placeholder="Ketik untuk mencari ID / Nama Alat"
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
                   <div className="text-xs text-teal-600 bg-teal-50 px-3 py-2 rounded-lg mt-2 border border-teal-100 font-medium">
                     Alat Terdeteksi: {selectedTool.name} {(selectedTool.id && selectedTool.id.trim() !== '-' && selectedTool.id.trim() !== '') ? `(${selectedTool.id})` : ''}
                   </div>
                )}
              </>
            ) : (
              <Input 
                placeholder="Masukkan nama alat / mesin secara manual..."
                value={formData.toolNameManual}
                onChange={(e) => setFormData({...formData, toolNameManual: e.target.value})}
                required
              />
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
