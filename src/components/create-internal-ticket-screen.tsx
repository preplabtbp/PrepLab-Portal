import { toast } from 'sonner';
import React, { useState, useEffect } from 'react';
import { Card, Input, Select, Textarea, Button } from './ui';
import { createInternalTicket, getInternalTicketCategories } from '../sheets-api';
import { Loader2, Image as ImageIcon, Send, ChevronLeft } from 'lucide-react';
import { DevModeAccordion, useDevOptions } from './dev-mode-accordion';
import { WhatsAppModal } from './whatsapp-modal';
import { PageHeader } from './PageHeader';

export function CreateInternalTicketScreen({ inspectorName, inspectorNik, onBack }: { inspectorName: string, inspectorNik: string, onBack?: () => void }) {
  const [formData, setFormData] = useState({
    shift: 'Pagi',
    tipeRequest: 'Rekayasa Engineering',
    tipeRequestCustom: '',
    priority: 'Medium',
    targetWaktu: '',
    lokasi: '',
    deskripsi: '',
    fotoUrl: ''
  });
  
  const [categories, setCategories] = useState<string[]>(['Rekayasa Engineering', 'Pembuatan Alat Bantu Kerja', 'Modifikasi Fasilitas']);
  
  useEffect(() => {
    getInternalTicketCategories().then(res => {
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setCategories(res.data);
      }
    }).catch(err => console.error(err));
  }, []);
  
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [waMessageText, setWaMessageText] = useState('');
  
  const { devOptions, setDevOptions, parsedDevOptions } = useDevOptions(inspectorNik);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.deskripsi) return toast.error('Deskripsi request harus diisi.');
    
    setSubmitting(true);
    try {
      const payload = {
        requestorName: inspectorName,
        category: formData.tipeRequest === 'Lainnya' ? formData.tipeRequestCustom : formData.tipeRequest,
        priority: formData.priority,
        targetDate: formData.targetWaktu,
        location: formData.lokasi,
        description: formData.deskripsi,
        photoUrl: formData.fotoUrl,
        status: 'Open'
      };
      
      const res = await createInternalTicket(payload);
      if (res.ticketId || res.success) {
        setSuccess(true);
        if (res.waMessageText) {
            setWaMessageText(res.waMessageText);
        }
      } else {
        toast.error('Gagal: ' + (res.message || res.error || 'Unknown error'));
      }
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setFormData({ ...formData, fotoUrl: evt.target.result.toString() });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
          <Send className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Request Berhasil Dikirim!</h2>
        <p className="text-slate-500">WO Permintaan telah disubmit.</p>
        
        <WhatsAppModal 
          isOpen={!!waMessageText} 
          onClose={() => {
             setWaMessageText('');
          }}
          messageText={waMessageText}
        />
        
        <Button onClick={onBack} className="mt-4 bg-slate-900 hover:bg-slate-800 text-white w-full max-w-sm">
          Kembali ke Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-4">
      <PageHeader 
        title="Form WO Permintaan"
        description="Request di luar kerusakan alat (Engineering, Tools, dll)"
        icon={<Send />}
      >
        {onBack && (
           <Button onClick={onBack} variant="secondary" className="h-9 bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-md">
             <ChevronLeft className="w-4 h-4 mr-1" /> Kembali
           </Button>
        )}
      </PageHeader>

      <DevModeAccordion inspectorNik={inspectorNik} devOptions={devOptions} setDevOptions={setDevOptions} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-6 space-y-6 border-t-4 border-t-indigo-500 shadow-sm">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Tipe Request <span className="text-rose-500">*</span></label>
              <Select value={formData.tipeRequest} onChange={e => setFormData({...formData, tipeRequest: e.target.value})} required className="w-full">
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="Lainnya">Lainnya...</option>
              </Select>
              {formData.tipeRequest === 'Lainnya' && (
                <div className="mt-2 animate-in fade-in slide-in-from-top-2">
                  <Input 
                    value={formData.tipeRequestCustom} 
                    onChange={e => setFormData({...formData, tipeRequestCustom: e.target.value})} 
                    required 
                    placeholder="Masukkan tipe request baru..." 
                    className="w-full"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Prioritas <span className="text-rose-500">*</span></label>
              <Select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} required className="w-full">
                <option value="Low">Low (Bisa ditunda)</option>
                <option value="Medium">Medium (Standar)</option>
                <option value="High">High (Mendesak)</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Lokasi / Area Kerja <span className="text-rose-500">*</span></label>
              <Input 
                value={formData.lokasi} 
                onChange={e => setFormData({...formData, lokasi: e.target.value})} 
                required 
                placeholder="Misal: Prep Kering, Workshop..." 
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Target Selesai (Opsional)</label>
              <Input 
                type="date"
                value={formData.targetWaktu} 
                onChange={e => setFormData({...formData, targetWaktu: e.target.value})} 
                className="w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Deskripsi Detail Request <span className="text-rose-500">*</span></label>
            <Textarea 
              value={formData.deskripsi} 
              onChange={e => setFormData({...formData, deskripsi: e.target.value})} 
              required 
              rows={4}
              placeholder="Jelaskan kebutuhan dengan detail..."
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Upload Bukti / Referensi Visual (Opsional)</label>
            {formData.fotoUrl ? (
              <div className="relative">
                <img src={formData.fotoUrl} alt="Preview" className="w-full max-h-48 object-cover rounded-xl border border-slate-200" />
                <button type="button" onClick={() => setFormData({...formData, fotoUrl: ''})} className="absolute top-2 right-2 bg-white text-rose-500 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                  Ganti Foto
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-sm text-slate-500 font-medium">Klik untuk upload gambar</p>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            )}
          </div>
        </Card>

        <Button type="submit" disabled={submitting} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-sm">
          {submitting ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Mengirim Request...</>
          ) : (
            <><Send className="w-5 h-5 mr-2" /> Kirim WO Permintaan</>
          )}
        </Button>
      </form>
    </div>
  );
}
