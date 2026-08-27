import { toast } from 'sonner';
import React, { useState } from 'react';
import { uploadPhotoToDrive } from '../../sheets-api';
import { Card, Button, Input, Select } from '../ui';
import { Camera, PlusCircle, Pill } from 'lucide-react';
import { InspectorSignatures, SignatureData } from '../InspectorSignatures';

export function FormP3K({ data, inspectorName, inspectorNik, onSubmit }: { data: any[], inspectorName: string, inspectorNik: string, onSubmit: (payload: any) => void }) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [tambahan, setTambahan] = useState<any[]>([
    { id: 1, item: '', stok: '', aktual: '', satuan: '', expDate: '', ket: '' },
    { id: 2, item: '', stok: '', aktual: '', satuan: '', expDate: '', ket: '' }
  ]);
  const [fotoBukti, setFotoBukti] = useState<string>('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [signatureData, setSignatureData] = useState<SignatureData | null>(null);

  const handleAnswer = (qId: string, field: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [qId]: { ...prev[qId], [field]: value }
    }));
  };

  const handleTambahan = (id: number, field: string, value: string) => {
    setTambahan(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxD = 600;
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
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
        
        try {
           const base64Data = compressedBase64.split(',')[1];
           setFotoBukti(compressedBase64);
        } catch(err) {
           console.error("Gagal upload", err);
           toast.error("Gagal upload foto");
        } finally {
           setIsUploadingPhoto(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!fotoBukti) {
      toast.error("Foto Bukti Proses Inspeksi WAJIB dilampirkan.");
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

    const payload: any[] = [];
    data.forEach(q => {
      const ans = answers[q.item] || {};
      payload.push({
        item: q.item,
        standar: q.info1 || '-',
        ketersediaan: ans.stok || 'Ada',
        jumlah: ans.aktual || '0',
        satuan: q.info2 || '-',
        expDate: ans.exp || '',
        keterangan: ans.ket || ''
      });
    });

    tambahan.forEach(t => {
      if (t.item.trim() !== '') {
        payload.push({
          item: t.item,
          standar: '-',
          ketersediaan: t.stok || 'Ada',
          jumlah: t.aktual || '0',
          satuan: t.satuan || '',
          expDate: t.expDate || '',
          keterangan: t.ket || ''
        });
      }
    });

    onSubmit({
      payload,
      fotoProses: fotoBukti,
      signatures: signatureData
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {data.map((q, idx) => {
        const ans = answers[q.item] || {};
        return (
          <Card key={idx} className="border-l-4 border-l-blue-500 p-4 space-y-4 bg-[var(--card-bg)] border-[var(--border-main)] text-[var(--text-main)]">
            <div>
              <h6 className="font-bold text-[var(--text-main)] text-sm mb-1">{idx + 1}. {q.item}</h6>
              <p className="text-xs text-[var(--text-muted)]">Standar: {q.info1 || '-'}</p>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Stok</label>
                <Select value={ans.stok || ''} onChange={e => handleAnswer(q.item, 'stok', e.target.value)}>
                  <option value="">Pilih</option>
                  <option value="Ada">Ada</option>
                  <option value="Kosong">Kosong</option>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Aktual</label>
                <div className="flex bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                  <input 
                    type="number" 
                    className="w-full bg-transparent px-2 py-2 text-sm focus:outline-none" 
                    placeholder="0"
                    value={ans.aktual || ''}
                    onChange={e => handleAnswer(q.item, 'aktual', e.target.value)}
                  />
                  <span className="text-xs text-slate-500 flex items-center px-2 border-l border-slate-200 bg-slate-50">
                    {q.info2 || '-'}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Exp</label>
                <input 
                  type="month" 
                  className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm"
                  value={ans.exp || ''}
                  onChange={e => handleAnswer(q.item, 'exp', e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <Input 
                placeholder="Catatan opsional..." 
                value={ans.ket || ''}
                onChange={e => handleAnswer(q.item, 'ket', e.target.value)}
                className="bg-slate-50 text-sm"
              />
            </div>
          </Card>
        );
      })}

      {tambahan.map((t, idx) => (
        <Card key={idx} className="border-l-4 border-l-slate-400 p-4 space-y-4">
          <h6 className="font-semibold text-slate-600 text-sm flex items-center gap-2">
            <PlusCircle className="w-4 h-4" /> Item Tambahan {idx + 1} (Opsional)
          </h6>
          <Input 
            placeholder="Nama barang..."
            value={t.item}
            onChange={e => handleTambahan(t.id, 'item', e.target.value)}
            className="font-semibold"
          />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Stok</label>
              <Select value={t.stok} onChange={e => handleTambahan(t.id, 'stok', e.target.value)}>
                <option value="">Pilih</option>
                <option value="Ada">Ada</option>
                <option value="Kosong">Kosong</option>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Aktual</label>
              <div className="flex bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                <input 
                  type="number" 
                  className="w-full bg-transparent px-2 py-2 text-sm focus:outline-none" 
                  placeholder="0"
                  value={t.aktual}
                  onChange={e => handleTambahan(t.id, 'aktual', e.target.value)}
                />
                <input 
                  type="text" 
                  className="w-16 bg-white border-l border-slate-200 px-1 py-2 text-xs focus:outline-none" 
                  placeholder="Satuan"
                  value={t.satuan}
                  onChange={e => handleTambahan(t.id, 'satuan', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Exp</label>
              <input 
                type="month" 
                className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm"
                value={t.expDate}
                onChange={e => handleTambahan(t.id, 'expDate', e.target.value)}
              />
            </div>
          </div>
          <Input 
            placeholder="Catatan opsional..." 
            value={t.ket}
            onChange={e => handleTambahan(t.id, 'ket', e.target.value)}
            className="bg-slate-50 text-sm"
          />
        </Card>
      ))}

      <Card className="border-l-4 border-l-emerald-500">
        <label className="text-sm font-semibold text-emerald-800 mb-2 flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Foto Bukti Proses Inspeksi (Wajib)
        </label>
        <Input 
          type="file" 
          accept="image/*" 
          onChange={handleImageUpload}
          className="mb-3 border-emerald-200 focus:border-emerald-400 bg-emerald-50"
        />
        {isUploadingPhoto && (
          <p className="text-xs text-emerald-600 font-medium animate-pulse">Memproses ukuran foto...</p>
        )}
        {fotoBukti && !isUploadingPhoto && (
          <div className="mt-3 text-center border rounded-xl p-3 bg-white border-emerald-100 shadow-sm">
            <img src={fotoBukti} alt="Preview" className="max-h-40 mx-auto rounded-lg object-contain" />
            <p className="mt-2 text-xs font-semibold text-emerald-600">✓ Foto Siap Dikirim</p>
          </div>
        )}
      </Card>

      <InspectorSignatures 
        inspectorName={inspectorName} 
        inspectorNik={inspectorNik} 
        onChange={setSignatureData} 
      />

      <Button onClick={handleSubmit} className="w-full py-6 text-lg shadow-xl shadow-primary/20">
        Kirim Laporan ke Server
      </Button>
    </div>
  );
}
