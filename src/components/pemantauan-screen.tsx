import { toast } from 'sonner';
import React, { useState, useRef } from 'react';
import { Card, Button, Input, Select, Textarea } from './ui';
import { ThermometerSun, Wind, ShieldCheck, CheckCircle2, Info, Loader2, Camera, Trash2, Droplets } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { submitPemantauanBatch, uploadPhotoToDrive } from '../sheets-api';
import { DevModeAccordion, useDevOptions } from './dev-mode-accordion';
import { PageHeader } from './PageHeader';

const RUANGAN_SUHU = ["Balance Room", "XRF Room", "Chiller Room", "Fusion Room", "Chemical Room"];
const TABUNG_GAS = ["Tabung Gas Zetium A (Argon)", "Tabung Gas Zetium B (Argon)", "Tabung Gas Epsilon C (Helium)"];

export function PemantauanScreen({ inspectorName, inspectorNik }: { inspectorName: string, inspectorNik: string }) {
  const [mode, setMode] = useState<'SUHU' | 'GAS'>('SUHU');
  const [shift, setShift] = useState('');
  const [catatan, setCatatan] = useState('');
  
  // Data State
  const [suhuData, setSuhuData] = useState<Record<string, { suhu: string, kel: string}>>({});
  const [gasData, setGasData] = useState<Record<string, { flow: string, pressure: string, leak: 'Y' | 'N' }>>({});
  
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const sigPadRef = useRef<SignatureCanvas>(null);
  
  const { devOptions, setDevOptions, parsedDevOptions } = useDevOptions(inspectorNik);

  const handleSuhuChange = (room: string, field: 'suhu' | 'kel', val: string) => {
    setSuhuData(prev => ({
      ...prev,
      [room]: { ...prev[room], [field]: val }
    }));
  };

  const handleGasChange = (gas: string, field: 'flow' | 'pressure' | 'leak', val: string) => {
    setGasData(prev => ({
      ...prev,
      [gas]: { ...prev[gas], leak: prev[gas]?.leak || 'N', [field]: val }
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearPad = () => {
    sigPadRef.current?.clear();
  };

  const handleSubmit = async () => {
    if (!shift) return toast.error("Pilih shift terlebih dahulu");
    if (sigPadRef.current?.isEmpty()) return toast.error("Tanda tangan wajib diisi");
    
    setLoading(true);
    try {
      let photoUrl = "";
      if (photoPreview) {
         const base64 = photoPreview.split(',')[1];
         photoUrl = await uploadPhotoToDrive(base64, "image/jpeg", `Pemantauan_${inspectorName.replace(/\s+/g, '_')}_${new Date().getTime()}.jpg`, 'Pemantauan');
      }

      const sigBase64 = sigPadRef.current?.getCanvas().toDataURL('image/png').split(',')[1];
      const sigUrl = sigBase64 ? await uploadPhotoToDrive(sigBase64, "image/png", `Sig_${inspectorName.replace(/\s+/g, '_')}_${new Date().getTime()}.png`, 'Pemantauan') : "";

      await submitPemantauanBatch({
        inspectorName,
        shift,
        suhuData,
        gasData,
        photoUrl,
        sigUrl,
        catatan,
        devOptions: parsedDevOptions
      });
      
      toast.success("Data pemantauan berhasil dikirim!");
      
      // Reset
      setSuhuData({});
      setGasData({});
      setShift('');
      setCatatan('');
      setPhotoPreview(null);
      clearPad();
      
    } catch (e) {
      console.error(e);
      toast.error("Gagal submit pemantauan");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
      <PageHeader 
        title="Pemantauan Rutin"
        description="Preparation & Laboratory"
        icon={<ShieldCheck />}
      >
        <div className="inline-flex items-center gap-3 px-3 py-2 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-white">
              <Info className="w-4 h-4" />
            </div>
            <div className="pr-2">
               <p className="text-[10px] uppercase tracking-wider font-medium text-slate-300 mb-0.5">Petugas Inspeksi</p>
               <p className="text-sm font-bold text-white">{inspectorName}</p>
            </div>
        </div>
      </PageHeader>

      <DevModeAccordion inspectorNik={inspectorNik} devOptions={devOptions} setDevOptions={setDevOptions} />

      {/* Control Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
           <Card className="h-full border border-slate-200 shadow-sm">
             <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
               Pengaturan Sesi
             </h3>
             <Select 
                label="Pilih Shift" 
                value={shift} 
                onChange={e => setShift(e.target.value)}
                options={[
                  { value: 'Pagi', label: 'Pagi (06:00 - 18:00)' },
                  { value: 'Malam', label: 'Malam (18:00 - 06:00)' },
                  { value: 'Long-Shift', label: 'Long-Shift' }
                ]}
                required
              />
           </Card>
        </div>
        
        <div className="md:col-span-2">
          {/* Mobile Tabs */}
          <div className="flex gap-2 lg:hidden mb-4 bg-slate-100 p-1.5 rounded-xl">
            <button 
              onClick={() => setMode('SUHU')}
              className={`flex-1 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'SUHU' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ThermometerSun className="w-4 h-4" /> Suhu & RH
            </button>
            <button 
              onClick={() => setMode('GAS')}
              className={`flex-1 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'GAS' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Wind className="w-4 h-4" /> Tekanan Gas
            </button>
          </div>
          
          <div className="hidden lg:block bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 mb-6">
            <p className="flex items-center gap-2 font-medium">
              <Info className="w-4 h-4 text-blue-600" />
              Lengkapi data parameter ruangan dan status tabung gas. Kosongkan baris jika tidak ada pemeriksaan.
            </p>
          </div>
        </div>
      </div>

      {/* Main Data Entry Layout */}
      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6">
        
        {/* Suhu & RH Section */}
        <div className={`lg:block ${mode === 'SUHU' ? 'block' : 'hidden'}`}>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-5 bg-blue-50/40 border-b border-slate-100 flex items-center gap-3 shrink-0">
              <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl"><ThermometerSun className="w-5 h-5" /></div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Suhu & Kelembapan</h3>
                <p className="text-xs text-slate-500 font-medium">Parameter ruangan area prep & lab</p>
              </div>
            </div>
            
            {/* Desktop View */}
            <div className="hidden sm:block overflow-x-auto p-0 flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-3">Ruangan</th>
                    <th className="px-3 py-3 w-32">Suhu (°C)</th>
                    <th className="px-3 py-3 w-32">RH (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {RUANGAN_SUHU.map(ruang => (
                    <tr key={ruang} className="hover:bg-slate-50/50 transition-colors">
                       <td className="px-5 py-3.5 font-semibold text-slate-700 text-sm whitespace-nowrap">{ruang}</td>
                       <td className="px-3 py-2.5">
                          <div className="relative">
                            <input type="number" step="0.1" value={suhuData[ruang]?.suhu || ''} onChange={e => handleSuhuChange(ruang, 'suhu', e.target.value)} placeholder="0.0" className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2.5 text-sm font-semibold focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all focus:bg-white" />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs font-medium">°C</div>
                          </div>
                       </td>
                       <td className="px-3 py-2.5">
                          <div className="relative">
                            <input type="number" step="1" value={suhuData[ruang]?.kel || ''} onChange={e => handleSuhuChange(ruang, 'kel', e.target.value)} placeholder="0" className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2.5 text-sm font-semibold focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-all focus:bg-white" />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs font-medium">%</div>
                          </div>
                       </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="block sm:hidden p-4 space-y-4 flex-1 bg-slate-50/50">
              {RUANGAN_SUHU.map(ruang => (
                <div key={ruang} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                   <h4 className="font-bold text-slate-800 text-sm">{ruang}</h4>
                   <div className="grid grid-cols-2 gap-3">
                     <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Suhu (°C)</label>
                        <div className="relative">
                          <input type="number" step="0.1" value={suhuData[ruang]?.suhu || ''} onChange={e => handleSuhuChange(ruang, 'suhu', e.target.value)} placeholder="0.0" className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2.5 text-sm font-semibold focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all focus:bg-white" />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs font-medium">°C</div>
                        </div>
                     </div>
                     <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">RH (%)</label>
                        <div className="relative">
                          <input type="number" step="1" value={suhuData[ruang]?.kel || ''} onChange={e => handleSuhuChange(ruang, 'kel', e.target.value)} placeholder="0" className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2.5 text-sm font-semibold focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 transition-all focus:bg-white" />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs font-medium">%</div>
                        </div>
                     </div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tekanan Gas Section */}
        <div className={`lg:block ${mode === 'GAS' ? 'block' : 'hidden'}`}>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-5 bg-emerald-50/40 border-b border-slate-100 flex items-center gap-3 shrink-0">
              <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl"><Wind className="w-5 h-5" /></div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Tekanan & Aliran Gas</h3>
                <p className="text-xs text-slate-500 font-medium">Monitoring tabung gas analitik</p>
              </div>
            </div>
            
            {/* Desktop View */}
            <div className="hidden sm:block overflow-x-auto p-0 flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-3">Tabung Gas</th>
                    <th className="px-3 py-3 w-28">Flow</th>
                    <th className="px-3 py-3 w-28">Pressure</th>
                    <th className="px-5 py-3 w-28 text-center">Leakage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {TABUNG_GAS.map(gas => (
                    <tr key={gas} className="hover:bg-slate-50/50 transition-colors">
                       <td className="px-5 py-3.5 font-semibold text-slate-700 text-sm whitespace-nowrap">{gas}</td>
                       <td className="px-3 py-2.5">
                          <input type="number" step="0.1" value={gasData[gas]?.flow || ''} onChange={e => handleGasChange(gas, 'flow', e.target.value)} placeholder="L/m" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all focus:bg-white text-center" />
                       </td>
                       <td className="px-3 py-2.5">
                          <input type="number" step="1" value={gasData[gas]?.pressure || ''} onChange={e => handleGasChange(gas, 'pressure', e.target.value)} placeholder="psi" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all focus:bg-white text-center" />
                       </td>
                       <td className="px-5 py-2.5 text-center">
                           <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                              <button onClick={() => handleGasChange(gas, 'leak', 'Y')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${gasData[gas]?.leak === 'Y' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}>Y</button>
                              <button onClick={() => handleGasChange(gas, 'leak', 'N')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${(gasData[gas]?.leak || 'N') === 'N' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}>N</button>
                           </div>
                       </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="block sm:hidden p-4 space-y-4 flex-1 bg-slate-50/50">
              {TABUNG_GAS.map(gas => (
                <div key={gas} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-4">
                   <h4 className="font-bold text-slate-800 text-sm leading-tight">{gas}</h4>
                   
                   <div className="grid grid-cols-2 gap-3">
                     <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Flow (L/m)</label>
                        <input type="number" step="0.1" value={gasData[gas]?.flow || ''} onChange={e => handleGasChange(gas, 'flow', e.target.value)} placeholder="0.0" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all focus:bg-white" />
                     </div>
                     <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Pressure (psi)</label>
                        <input type="number" step="1" value={gasData[gas]?.pressure || ''} onChange={e => handleGasChange(gas, 'pressure', e.target.value)} placeholder="0" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all focus:bg-white" />
                     </div>
                   </div>

                   <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                     <label className="text-xs font-bold text-slate-600">Ada Kebocoran?</label>
                     <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button onClick={() => handleGasChange(gas, 'leak', 'Y')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${gasData[gas]?.leak === 'Y' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}>Y</button>
                        <button onClick={() => handleGasChange(gas, 'leak', 'N')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${(gasData[gas]?.leak || 'N') === 'N' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}>N</button>
                     </div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Completion Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-slate-200 shadow-sm h-full">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
            Verifikasi Petugas
          </h3>
          <div className="mb-4">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1 block">
              Tanda Tangan <span className="text-rose-500">*</span>
            </label>
            <div className="relative border-2 border-dashed border-indigo-200 rounded-xl bg-slate-50 mb-2 overflow-hidden">
               <Button onClick={clearPad} variant="secondary" className="absolute top-2 right-2 h-7 px-3 text-xs z-10 bg-white/90 backdrop-blur text-rose-600 border-rose-200 hover:bg-rose-50 shadow-sm font-bold">
                 <Trash2 className="w-3 h-3 mr-1" /> Ulangi
               </Button>
               <SignatureCanvas
                  ref={sigPadRef}
                  penColor="#1e293b"
                  canvasProps={{ className: 'w-full h-40 block touch-none cursor-crosshair' }}
                />
            </div>
            <p className="text-[10px] text-slate-500 text-center font-medium">Tanda tangan di dalam area garis putus-putus</p>
          </div>
        </Card>

        <Card className="border border-slate-200 shadow-sm h-full flex flex-col">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
            Dokumentasi & Catatan
          </h3>
          <div className="mb-5 flex-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1 block">
              <Camera className="w-4 h-4 text-slate-400" /> Foto Pendukung (Opsional)
            </label>
            {photoPreview ? (
              <div className="relative">
                <img src={photoPreview} className="w-full h-40 object-cover rounded-xl border border-slate-200 shadow-sm" />
                <Button onClick={() => setPhotoPreview(null)} variant="secondary" className="absolute top-2 right-2 bg-white/90 shadow-sm h-8 px-4 font-bold text-xs text-slate-700">Ganti Foto</Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center mb-2 border border-slate-200">
                  <Camera className="w-5 h-5 text-slate-400" />
                </div>
                <span className="text-sm font-bold text-slate-600">Unggah Foto Dokumentasi</span>
                <span className="text-xs text-slate-400 mt-1">Ketuk untuk memilih dari galeri</span>
                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </label>
            )}
          </div>
          <Textarea 
             label="Catatan Tambahan (Opsional)" 
             placeholder="Tulis kondisi abnormal, kerusakan, atau temuan khusus jika ada..."
             value={catatan}
             onChange={e => setCatatan(e.target.value)}
             className="h-24 bg-slate-50"
          />
        </Card>
      </div>

      <div className="pt-4 border-t border-slate-200">
        <Button onClick={handleSubmit} disabled={loading} className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg shadow-xl shadow-indigo-600/20 rounded-xl border-none">
          {loading ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <CheckCircle2 className="w-6 h-6 mr-2" />}
          {loading ? 'Menyimpan & Mengirim Data...' : 'Kirim Laporan Pemantauan'}
        </Button>
        <p className="text-center text-xs text-slate-500 mt-4 font-medium flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> Data diamankan dan disinkronisasi ke Google Sheets
        </p>
      </div>
    </div>
  );
}
