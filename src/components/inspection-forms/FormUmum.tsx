import { toast } from 'sonner';
import React, { useState, useMemo, useEffect } from 'react';
import { uploadPhotoToDrive } from '../../sheets-api';
import { Card, Button, Input, Select } from '../ui';
import { ChevronDown, PlusCircle, Trash2, Camera, ShieldAlert } from 'lucide-react';
import { InspectorSignatures, SignatureData } from '../InspectorSignatures';
import { TemuanItem, TemuanSection } from './TemuanSection';

export function FormUmum({ data, inspectorName, inspectorNik, onSubmit, autoFillAllYa }: { data: any[], inspectorName: string, inspectorNik: string, onSubmit: (payload: any) => void, autoFillAllYa?: number }) {
  const [subArea, setSubArea] = useState('');
  const [answers, setAnswers] = useState<Record<string, { jawaban: string, ket: string }>>({});

  useEffect(() => {
    if (autoFillAllYa && autoFillAllYa > 0 && data && data.length > 0) {
      const allAnswers: Record<string, { jawaban: string, ket: string }> = {};
      data.forEach(q => {
        const id = q.id_pertanyaan || q.idPertanyaan || q.id;
        if (id) {
          allAnswers[id] = { jawaban: 'YA', ket: '' };
        }
      });
      setAnswers(allAnswers);
    }
  }, [autoFillAllYa, data]);
  const [temuan, setTemuan] = useState<TemuanItem[]>([]);
  
  const [fotoBukti, setFotoBukti] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [signatureData, setSignatureData] = useState<SignatureData | null>(null);
  const [catatan, setCatatan] = useState('');
  
  const subAreas = useMemo(() => {
    const areas = new Set<string>();
    data.forEach(q => {
      if (q.info1 && q.info1.toUpperCase() !== "ALL") {
        q.info1.split(',').forEach((s: string) => areas.add(s.trim()));
      }
    });
    return Array.from(areas).filter(Boolean).sort();
  }, [data]);

  const isQuestionRelevant = (q: any) => {
    if (!subArea) return true; // Show all if none selected, or maybe return false? But UI hides questions if !subArea anyway.
    if (!q.info1 || q.info1.toUpperCase() === "ALL") return true;
    const areas = q.info1.split(',').map((s: string) => s.trim());
    return areas.includes(subArea);
  };
  
  const handleAnswer = (qId: string, ans: string) => {
    setAnswers(prev => ({ ...prev, [qId]: { ...prev[qId], jawaban: ans } }));
  }
  const handleKeterangan = (qId: string, ket: string) => {
    setAnswers(prev => ({ ...prev, [qId]: { ...prev[qId], ket } }));
  }
  
  const groupedData: Record<string, any[]> = {};
  data.forEach(item => {
    if(!groupedData[item.kategori]) groupedData[item.kategori] = [];
    groupedData[item.kategori].push(item);
  });

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
    if (!subArea) {
      toast("Pilih Lokasi Spesifik / Sub-Area terlebih dahulu!");
      return;
    }
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
      const qId = q.item; // using item as ID for simplicity
      if (isQuestionRelevant(q)) {
        const ans = answers[qId];
        payload.push({
          kategori: q.kategori,
          pertanyaan: q.item,
          jawaban: ans?.jawaban || '',
          keterangan: ans?.ket || ''
        });
      }
    });

    const finalTemuan = temuan.filter(t => t.temuan.trim() !== "");
    const fotoTemuanArray = finalTemuan.map(t => t.foto || '').slice(0, 3);

    onSubmit({
      lokasiUmum: subArea,
      payload,
      temuanUmum: finalTemuan,
      catatanUmum: catatan,
      fotoTemuanArray,
      fotoProses: fotoBukti,
      signatures: signatureData
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-l-4 border-l-blue-500">
        <label className="text-sm font-bold text-[var(--text-main)] mb-2 block">Pilih Lokasi Spesifik <span className="text-rose-500">*</span></label>
        <Select value={subArea} onChange={e => setSubArea(e.target.value)} className="w-full">
          <option value="">-- Pilih Lokasi / Sub-Area --</option>
          {subAreas.map(area => (
            <option key={area} value={area}>{area}</option>
          ))}
        </Select>
      </Card>
      
      {subArea && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {Object.entries(groupedData)
            .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
            .map(([kategori, questions]) => {
            const relevantQuestions = questions.filter(isQuestionRelevant);
            if (relevantQuestions.length === 0) return null;
            return (
              <Card key={kategori} className="overflow-hidden p-0 border border-[var(--border-main)]">
                <div className="bg-[var(--input-bg)] px-4 py-3 border-b border-[var(--border-main)] flex items-center justify-between">
                  <h3 className="font-bold text-[var(--text-main)]">{kategori}</h3>
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 px-2.5 py-1 rounded-full">{relevantQuestions.length} Item</span>
                </div>
                <div className="p-4 space-y-5">
                  {relevantQuestions.map((q, idx) => {
                    const ans = answers[q.item];
                    return (
                      <div key={idx} className="pb-4 border-b border-[var(--border-main)] last:border-0 last:pb-0">
                        <p className="text-sm sm:text-base font-bold text-[var(--text-main)] mb-3 leading-relaxed">{q.item}</p>
                        
                        <div className="flex gap-2 mb-3">
                          <button
                            onClick={() => handleAnswer(q.item, 'YA')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg border ${ans?.jawaban === 'YA' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-[var(--card-bg)] text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'} transition-all`}
                          >
                            YA
                          </button>
                          <button
                            onClick={() => handleAnswer(q.item, 'TIDAK')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg border ${ans?.jawaban === 'TIDAK' ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-[var(--card-bg)] text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-700/60 hover:bg-rose-50 dark:hover:bg-rose-950/30'} transition-all`}
                          >
                            TDK
                          </button>
                          <button
                            onClick={() => handleAnswer(q.item, 'N/A')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg border ${ans?.jawaban === 'N/A' ? 'bg-slate-600 text-white border-slate-600 shadow-sm' : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--border-main)] hover:bg-[var(--input-bg)]'} transition-all`}
                          >
                            N/A
                          </button>
                        </div>
                        
                        <Input 
                          placeholder="Keterangan / Detail temuan (Opsional)..."
                          value={ans?.ket || ''}
                          onChange={(e) => handleKeterangan(q.item, e.target.value)}
                          className="bg-[var(--input-bg)] border-[var(--border-main)] text-[var(--text-main)] placeholder:text-[var(--text-muted)] text-sm"
                        />
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}

          <TemuanSection temuan={temuan} setTemuan={setTemuan} />
          
          <Card>
            <label className="text-sm font-bold text-[var(--text-main)] mb-2 block">Catatan Tambahan (Bila Ada)</label>
            <Input 
              value={catatan}
              onChange={e => setCatatan(e.target.value)}
              placeholder="Tulis ringkasan atau catatan keseluruhan..."
              className="bg-[var(--input-bg)] border-[var(--border-main)] text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
            />
          </Card>
          
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
            onChange={(data: any) => setSignatureData(data)} 
          />
          
          <Button onClick={handleSubmit} className="w-full py-6 text-lg shadow-xl shadow-primary/20">
            Kirim Laporan ke Server
          </Button>
        </div>
      )}
    </div>
  );
}
