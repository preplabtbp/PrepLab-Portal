import { toast } from 'sonner';
import React, { useState } from 'react';
import { uploadPhotoToDrive } from '../../sheets-api';
import { Card, Button, Input } from '../ui';
import { Camera, MapPin, Tag, Barcode, Wrench } from 'lucide-react';
import { InspectorSignatures, SignatureData } from '../InspectorSignatures';

export function FormPerkakas({ data, inspectorName, inspectorNik, onSubmit }: { data: any[], inspectorName: string, inspectorNik: string, onSubmit: (payload: any) => void }) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [fotoBukti, setFotoBukti] = useState<string>('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [signatureData, setSignatureData] = useState<SignatureData | null>(null);

  const handleAnswer = (qId: string, field: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [qId]: { ...prev[qId], [field]: value }
    }));
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
        item: q.item.replace(/^\\d+\\.\\s*/, "").trim(),
        merk: q.info1 || '-',
        asset: q.info2 || '-',
        lokasi: q.info3 || '-',
        aktual: ans.aktual || '0',
        max: q.info4 || '4',
        keterangan: ans.ket || '-'
      });
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
        const maxP = q.info4 || "4";
        const ans = answers[q.item] || {};
        return (
          <Card key={idx} className="border-l-4 border-l-amber-500 p-4 space-y-4 bg-[var(--card-bg)] border-[var(--border-main)] text-[var(--text-main)]">
            <h6 className="font-bold text-[var(--text-main)] text-sm">{idx + 1}. {q.item}</h6>
            
            <div className="flex flex-wrap gap-2 text-[11px] font-medium">
              <span className="flex items-center gap-1 bg-[var(--input-bg)] border border-[var(--border-main)] text-[var(--text-muted)] px-2 py-1 rounded-md">
                <Tag className="w-3 h-3" /> {q.info1 || '-'}
              </span>
              <span className="flex items-center gap-1 bg-[var(--input-bg)] border border-[var(--border-main)] text-[var(--text-muted)] px-2 py-1 rounded-md">
                <Barcode className="w-3 h-3" /> {q.info2 || '-'}
              </span>
              <span className="flex items-center gap-1 bg-[var(--input-bg)] border border-[var(--border-main)] text-[var(--text-muted)] px-2 py-1 rounded-md">
                <MapPin className="w-3 h-3" /> {q.info3 || '-'}
              </span>
            </div>

            <div className="bg-[var(--input-bg)] p-3 rounded-lg border border-[var(--border-main)] flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <label className="text-xs font-semibold text-primary block mb-1">Point Aktual</label>
                <div className="flex bg-white rounded-lg overflow-hidden border border-primary/20">
                  <input 
                    type="number" 
                    className="w-full bg-transparent px-2 py-2 text-sm focus:outline-none font-bold text-primary text-center" 
                    placeholder="0"
                    max={maxP}
                    value={ans.aktual || ''}
                    onChange={e => handleAnswer(q.item, 'aktual', e.target.value)}
                  />
                  <span className="text-sm font-bold text-slate-400 flex items-center px-3 border-l border-slate-100 bg-slate-50">
                    / {maxP}
                  </span>
                </div>
              </div>
              <div className="flex-[2]">
                <label className="text-xs font-semibold text-rose-600 block mb-1">Catatan</label>
                <Input 
                  placeholder="Keterangan..." 
                  value={ans.ket || ''}
                  onChange={e => handleAnswer(q.item, 'ket', e.target.value)}
                  className="bg-white border-rose-200 focus:border-rose-400 text-sm"
                />
              </div>
            </div>
          </Card>
        );
      })}

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
