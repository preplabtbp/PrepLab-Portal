import { toast } from 'sonner';
import React, { useState, useEffect, useMemo } from 'react';
import { uploadPhotoToDrive } from '../../sheets-api';
import { Card, Button, Input, Select } from '../ui';
import { Camera, PlusCircle, Pill, Info, ShieldAlert } from 'lucide-react';
import { InspectorSignatures, SignatureData } from '../InspectorSignatures';

const EXCLUDED_P3K_NAMES = ['gunting', 'lampu senter', 'pinset', 'silet'];

const isExcludedP3KItem = (itemName: string) => {
  if (!itemName) return false;
  const lower = itemName.trim().toLowerCase();
  return EXCLUDED_P3K_NAMES.some(name => lower === name || lower.startsWith(name + ' ') || lower.endsWith(' ' + name));
};

export function FormP3K({ data, inspectorName, inspectorNik, onSubmit, autoFillAllYa }: { data: any[], inspectorName: string, inspectorNik: string, onSubmit: (payload: any) => void, autoFillAllYa?: number }) {
  const [answers, setAnswers] = useState<Record<string, any>>({});

  // Filter out items not provided by safety team from displayed questions
  const activeQuestions = useMemo(() => {
    return (data || []).filter(q => !isExcludedP3KItem(q.item || q.questionText || ''));
  }, [data]);

  // Keep reference of excluded questions to preserve official standard and unit
  const excludedQuestions = useMemo(() => {
    return (data || []).filter(q => isExcludedP3KItem(q.item || q.questionText || ''));
  }, [data]);

  useEffect(() => {
    if (autoFillAllYa && autoFillAllYa > 0 && activeQuestions.length > 0) {
      const allAnswers: Record<string, any> = {};
      activeQuestions.forEach(q => {
        const key = q.item || q.id_pertanyaan || q.idPertanyaan || q.id;
        if (key) {
          const numMatch = (q.info1 || '').match(/\d+/);
          const defaultAktual = numMatch ? numMatch[0] : '1';
          allAnswers[key] = { stok: 'Ada', aktual: defaultAktual, exp: '', ket: '' };
        }
      });
      setAnswers(allAnswers);
    }
  }, [autoFillAllYa, activeQuestions]);
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
    
    // 1. Process active inspected items (excluding Gunting, Lampu senter, Pinset, Silet)
    activeQuestions.forEach(q => {
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

    // 2. Automatically populate excluded items as 'Kosong' with keterangan 'Tidak disediakan'
    const handledExcluded = new Set<string>();
    excludedQuestions.forEach(q => {
      handledExcluded.add(q.item.toLowerCase());
      payload.push({
        item: q.item,
        standar: q.info1 || '-',
        ketersediaan: 'Kosong',
        jumlah: '0',
        satuan: q.info2 || '-',
        expDate: '',
        keterangan: 'Tidak disediakan'
      });
    });

    // Safety fallback: Ensure all 4 items are present in payload even if missing from input data
    const defaultExcludedList = [
      { item: 'Gunting', standar: '1 buah', satuan: 'buah' },
      { item: 'Lampu senter', standar: '1 buah', satuan: 'buah' },
      { item: 'Pinset', standar: '1 buah', satuan: 'buah' },
      { item: 'Silet', standar: '2 pasang', satuan: 'pasang' }
    ];

    defaultExcludedList.forEach(def => {
      if (!handledExcluded.has(def.item.toLowerCase()) && !payload.some(p => p.item.toLowerCase() === def.item.toLowerCase())) {
        payload.push({
          item: def.item,
          standar: def.standar,
          ketersediaan: 'Kosong',
          jumlah: '0',
          satuan: def.satuan,
          expDate: '',
          keterangan: 'Tidak disediakan'
        });
      }
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
      {/* Notice box regarding items not provided by safety */}
      <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/80 rounded-xl p-3.5 text-xs text-sky-800 dark:text-sky-300 flex items-start gap-3 shadow-xs">
        <div className="p-1 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-300 shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div>
          <h6 className="font-bold text-sky-900 dark:text-sky-200">Standar Khusus Item Kotak P3K:</h6>
          <p className="mt-0.5 text-sky-700 dark:text-sky-300 leading-relaxed text-[11px] sm:text-xs">
            Item <strong>Gunting, Lampu Senter, Pinset, dan Silet</strong> memang tidak disediakan dari tim safety. Keempat item ini telah dihilangkan dari pertanyaan inspeksi dan otomatis terisi <strong>Kosong (Keterangan: Tidak disediakan)</strong> pada laporan rekapan.
          </p>
        </div>
      </div>

      {activeQuestions.map((q, idx) => {
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
