import { toast } from 'sonner';
import React, { useState } from 'react';
import { uploadPhotoToDrive } from '../../sheets-api';
import { Card, Button, Input } from '../ui';
import { Camera, PlusCircle, Trash2, Truck } from 'lucide-react';
import { InspectorSignatures, SignatureData } from '../InspectorSignatures';
import { formatProofImageUrl } from '../SimplifiedInspectionModal';

const ITEMS = [
  { id: 'Rotary', label: 'Lampu Rotary' },
  { id: 'Depan', label: 'Lampu Depan' },
  { id: 'Belakang', label: 'Lampu Belakang' },
  { id: 'Rem', label: 'Lampu Rem' },
  { id: 'Sign', label: 'Lampu Sign' },
  { id: 'Seatbelt', label: 'Seat Belt' },
  { id: 'Kaca', label: 'Kaca Spion' },
  { id: 'Wiper', label: 'Wiper' },
  { id: 'Band', label: 'Ban Depan' },
  { id: 'Banb', label: 'Ban Belakang' }
];

export function FormSarana({ inspectorName, inspectorNik, onSubmit, autoFillAllYa }: { inspectorName: string, inspectorNik: string, onSubmit: (payload: any) => void, autoFillAllYa?: number }) {
  const [signatureData, setSignatureData] = useState<SignatureData | null>(null);
  const [uploadingUnitId, setUploadingUnitId] = useState<number | null>(null);
  const [units, setUnits] = useState<any[]>([
    { 
      id: Date.now(), 
      unit: '', 
      ket: '', 
      foto: '', 
      previewUrl: '',
      checks: ITEMS.reduce((acc, curr) => ({ ...acc, [curr.id]: '✔' }), {}) 
    }
  ]);

  React.useEffect(() => {
    if (autoFillAllYa && autoFillAllYa > 0) {
      setUnits(prev => prev.map(u => ({
        ...u,
        checks: ITEMS.reduce((acc, curr) => ({ ...acc, [curr.id]: '✔' }), {})
      })));
    }
  }, [autoFillAllYa]);

  const handleAddUnit = () => {
    if (units.length >= 3) {
      toast('Anda hanya bisa menginspeksi maksimal 3 Unit dalam satu laporan.');
      return;
    }
    setUnits([
      ...units,
      { 
        id: Date.now(), 
        unit: '', 
        ket: '', 
        foto: '', 
        previewUrl: '',
        checks: ITEMS.reduce((acc, curr) => ({ ...acc, [curr.id]: '✔' }), {}) 
      }
    ]);
  };

  const handleRemoveUnit = (id: number) => {
    setUnits(units.filter(u => u.id !== id));
  };

  const handleUnitChange = (id: number, field: string, value: any) => {
    setUnits(units.map(u => u.id === id ? { ...u, [field]: value } : u));
  };

  const handleCheckChange = (unitId: number, checkId: string, value: string) => {
    setUnits(units.map(u => {
      if (u.id === unitId) {
        return {
          ...u,
          checks: { ...u.checks, [checkId]: value }
        };
      }
      return u;
    }));
  };

  const handleImageUpload = async (unitId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingUnitId(unitId);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxD = 800;
        if (width > height) {
          if (width > maxD) {
            height *= maxD / width;
            width = maxD;
          }
        } else {
          if (height > maxD) {
            width *= maxD / height;
            height = maxD;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

        // 1. Simpan preview lokal langsung agar tampilan instan dan tidak pernah broken
        setUnits(prevUnits => prevUnits.map(u => u.id === unitId ? { 
          ...u, 
          foto: compressedBase64,
          previewUrl: compressedBase64 
        } : u));
        
        try {
           const base64Data = compressedBase64.split(',')[1];
           const cleanFileName = (file.name || 'foto_sarana.jpg').replace(/\.jpeg$/i, '.jpg');
           const url = await uploadPhotoToDrive(base64Data, 'image/jpeg', cleanFileName, 'Form Inspeksi');
           setUnits(prevUnits => prevUnits.map(u => u.id === unitId ? { 
             ...u, 
             foto: url || compressedBase64,
             previewUrl: compressedBase64 
           } : u));
        } catch(err) {
           console.error("Upload Google Drive gagal, tetap menggunakan base64 lokal:", err);
        } finally {
           setUploadingUnitId(null);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    let hasError = false;
    let errMsg = "";

    const payload = units.map((u, idx) => {
      let adaRusak = false;
      Object.values(u.checks).forEach(val => {
        if (val === '❌') adaRusak = true;
      });

      if (!u.unit.trim()) {
        hasError = true;
        errMsg = `Nama Unit ke-${idx + 1} belum diisi.`;
      } else if (!u.foto) {
        hasError = true;
        errMsg = `Foto untuk Unit ${u.unit || (idx+1)} belum diunggah.`;
      } else if (adaRusak && !u.ket.trim()) {
        hasError = true;
        errMsg = `Keterangan pada Unit "${u.unit}" WAJIB diisi karena ada komponen yang disilang (❌).`;
      }

      return {
        unit: u.unit.trim() || 'UNIT_TEST',
        checks: u.checks,
        ket: u.ket.trim(),
        foto: u.foto
      };
    });

    if (hasError) {
      toast(errMsg);
      return;
    }

    if (!signatureData?.ttd1) {
      toast.error("Tanda tangan Inspektor Utama wajib diisi!");
      return;
    }
    if (signatureData.insp2Name && !signatureData.ttd2) {
      toast.error(`Tanda tangan Inspektor 2 (${signatureData.insp2Name}) wajib diisi!`);
      return;
    }
    if (signatureData.insp3Name && !signatureData.ttd3) {
      toast.error(`Tanda tangan Inspektor 3 (${signatureData.insp3Name}) wajib diisi!`);
      return;
    }

    const allUnitPhotos = payload.map(u => u.foto).filter(Boolean);
    onSubmit({ 
      payload, 
      fotoProses: payload[0]?.foto || '', 
      fotoTemuanArray: allUnitPhotos,
      signatures: signatureData 
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {units.map((u, idx) => (
        <Card key={u.id} className="border-l-4 border-l-primary p-5 space-y-5">
          <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
            <h3 className="font-bold text-primary flex items-center gap-2">
              <Truck className="w-5 h-5" /> Unit {idx + 1}
            </h3>
            {units.length > 1 && (
              <button onClick={() => handleRemoveUnit(u.id)} className="text-xs font-bold bg-rose-100 text-rose-600 px-3 py-1.5 rounded-lg hover:bg-rose-200 transition-colors flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Hapus
              </button>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Nama / Nomor Unit <span className="text-rose-500">*</span></label>
            <Input 
              placeholder="Contoh: LV-01 / Dump Truck" 
              value={u.unit} 
              onChange={e => handleUnitChange(u.id, 'unit', e.target.value)}
              className="font-semibold text-primary"
            />
          </div>

          <div className="bg-[var(--input-bg)] p-4 rounded-xl border border-[var(--border-main)]">
            <label className="text-xs font-bold text-[var(--text-main)] block mb-3 bg-[var(--card-bg)] p-2 rounded-lg border border-[var(--border-main)] text-center uppercase tracking-wider">
              Kondisi Komponen (Pilih ❌ jika Rusak)
            </label>
            
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {ITEMS.map(item => (
                <div key={item.id} className="bg-[var(--card-bg)] p-2 rounded-lg border border-[var(--border-main)] shadow-sm flex flex-col justify-between">
                  <label className="text-[11px] font-bold text-[var(--text-main)] mb-2 truncate text-center" title={item.label}>
                    {item.label}
                  </label>
                  <div className="flex gap-1 justify-center">
                    <button
                      onClick={() => handleCheckChange(u.id, item.id, '✔')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center ${u.checks[item.id] === '✔' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-100 text-emerald-600 hover:bg-emerald-50'}`}
                    >
                      ✔
                    </button>
                    <button
                      onClick={() => handleCheckChange(u.id, item.id, '❌')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center ${u.checks[item.id] === '❌' ? 'bg-rose-500 text-white shadow-sm' : 'bg-slate-100 text-rose-600 hover:bg-rose-50'}`}
                    >
                      ❌
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-rose-600 block mb-1">Keterangan (Wajib jika ada ❌)</label>
            <Input 
              placeholder="Ketikan keterangan kerusakan..." 
              value={u.ket} 
              onChange={e => handleUnitChange(u.id, 'ket', e.target.value)}
              className="border-rose-200 focus:border-rose-400 bg-rose-50/50"
            />
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-primary" /> Upload Foto Unit <span className="text-rose-500">*</span>
            </label>
            <Input 
              type="file" 
              accept="image/*"
              onChange={(e) => handleImageUpload(u.id, e)}
              className="bg-white dark:bg-slate-800 text-sm"
            />
            {uploadingUnitId === u.id && (
              <p className="text-xs text-blue-500 mt-1 animate-pulse font-semibold">Mengunggah &amp; mengompresi foto...</p>
            )}
            {(u.previewUrl || u.foto) && (
              <div className="mt-3 text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                    ✓ Foto Terunggah
                  </span>
                  <button
                    type="button"
                    onClick={() => setUnits(prev => prev.map(item => item.id === u.id ? { ...item, foto: '', previewUrl: '' } : item))}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 underline"
                  >
                    Hapus Foto
                  </button>
                </div>
                <div className="relative max-w-xs mx-auto rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950/5 dark:bg-slate-950/30 shadow-xs">
                  <img 
                    src={u.previewUrl || formatProofImageUrl(u.foto)} 
                    alt={`Preview Unit ${u.unit || (idx + 1)}`} 
                    onError={(e) => {
                      const raw = u.foto;
                      const driveMatch = raw?.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || raw?.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                      if (driveMatch) {
                        e.currentTarget.src = `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
                      }
                    }}
                    className="w-full max-h-48 object-contain rounded-xl mx-auto" 
                  />
                </div>
              </div>
            )}
          </div>
        </Card>
      ))}

      {units.length < 3 && (
        <Button onClick={handleAddUnit} variant="secondary" className="w-full border-dashed border-2 py-6 text-primary hover:bg-primary/5">
          <PlusCircle className="w-5 h-5 mr-2" /> Tambah Unit Kendaraan (Max 3)
        </Button>
      )}

      <InspectorSignatures 
        inspectorName={inspectorName} 
        inspectorNik={inspectorNik} 
        onChange={setSignatureData} 
      />

      <Button onClick={handleSubmit} className="w-full py-6 text-lg shadow-xl shadow-primary/20 mt-8">
        Kirim Laporan ke Server
      </Button>
    </div>
  );
}
