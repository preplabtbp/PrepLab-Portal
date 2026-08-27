import { toast } from 'sonner';
import React, { useState, useMemo, useEffect } from 'react';
import { uploadPhotoToDrive } from '../../sheets-api';
import { Card, Button, Input, Select } from '../ui';
import { Camera, Layers, AlertCircle } from 'lucide-react';
import { InspectorSignatures, SignatureData } from '../InspectorSignatures';

export function FormTangga({ data, inspectorName, inspectorNik, onSubmit, autoFillAllYa }: { data: any[], inspectorName: string, inspectorNik: string, onSubmit: (payload: any) => void, autoFillAllYa?: number }) {
  const [pilihan, setPilihan] = useState('');
  const [catatan, setCatatan] = useState('');
  const [checks, setChecks] = useState<number[]>(Array(11).fill(4)); // default all 4

  useEffect(() => {
    if (autoFillAllYa && autoFillAllYa > 0) {
      setChecks(Array(11).fill(4));
    }
  }, [autoFillAllYa]);

  const [fotoBukti, setFotoBukti] = useState<string>('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [signatureData, setSignatureData] = useState<SignatureData | null>(null);

  // Extract tangga db
  const { options, dbLokasi, listPertanyaan } = useMemo(() => {
    let opts: { label: string, value: string }[] = [];
    let locMap: Record<string, string> = {};
    let questions: string[] = [];

    data.forEach(q => {
      if (q.item && q.item.trim() !== "") {
        questions.push(q.item);
      }
      if (q.info1 && q.info1.trim() !== "") {
        const reg = q.info1.trim();
        const loc = (q.info2 || "-").trim();
        const namaTangga = (q.info3 || "").trim();
        let labelDropdown = reg;
        if (namaTangga !== "") {
          labelDropdown += " " + namaTangga;
        }
        opts.push({ label: labelDropdown, value: labelDropdown });
        locMap[labelDropdown] = loc;
      }
    });

    while (questions.length < 11) {
      questions.push("Pertanyaan " + (questions.length + 1));
    }

    return { options: opts, dbLokasi: locMap, listPertanyaan: questions.slice(0, 11) };
  }, [data]);

  const lokasiSekarang = pilihan ? dbLokasi[pilihan] || '-' : '';

  const handleCheckChange = (idx: number, val: string) => {
    const num = parseInt(val) || 0;
    setChecks(prev => {
      const n = [...prev];
      n[idx] = num;
      return n;
    });
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
    if (!pilihan) {
      toast.error("Silakan pilih Tangga yang diinspeksi terlebih dahulu.");
      return;
    }

    let adaNilaiKurangDari4 = false;
    for (let i = 0; i < 11; i++) {
      if (checks[i] < 1 || checks[i] > 4) {
        toast(`Nilai aktual untuk pertanyaan No. ${i + 1} harus antara 1 sampai 4.`);
        return;
      }
      if (checks[i] < 4) {
        adaNilaiKurangDari4 = true;
      }
    }

    if (adaNilaiKurangDari4 && !catatan.trim()) {
      toast.error("Ada nilai kurang dari 4. Catatan Kerusakan WAJIB diisi!");
      return;
    }

    if (!fotoBukti) {
      toast.error("Foto Bukti Proses Inspeksi Tangga WAJIB dilampirkan.");
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

    const payload = [{
      reg: pilihan,
      lokasi: lokasiSekarang,
      checks: checks,
      ket: catatan.trim()
    }];

    onSubmit({ payload, fotoProses: fotoBukti, signatures: signatureData });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Card className="border-l-4 border-l-primary p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-primary block mb-2">Pilih Tangga yang Diinspeksi <span className="text-rose-500">*</span></label>
            <Select value={pilihan} onChange={e => setPilihan(e.target.value)} className="font-bold text-slate-800">
              <option value="">-- Pilih Kode Tangga --</option>
              {options.map((opt, i) => (
                <option key={i} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-sm font-semibold text-primary block mb-2">Lokasi / Area <span className="text-rose-500">*</span></label>
            <Input 
              value={lokasiSekarang} 
              readOnly 
              className="bg-slate-100 text-slate-600 font-semibold cursor-not-allowed border-slate-200"
              placeholder="Lokasi otomatis terisi..."
            />
          </div>
        </div>
      </Card>

      {pilihan && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <Card className="bg-[var(--card-bg)] border border-[var(--border-main)] p-0 overflow-hidden text-[var(--text-main)]">
            <div className="bg-[var(--input-bg)] px-5 py-4 border-b border-[var(--border-main)]">
              <h3 className="font-bold text-[var(--primary)] flex items-center gap-2">
                <Layers className="w-5 h-5" /> Formulir Pengecekan
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">Isi Nilai Aktual 1-4. Nilai kurang dari 4 wajib mengisi catatan.</p>
            </div>
            
            <div className="p-5 space-y-4">
              {listPertanyaan.map((pert, idx) => (
                <div key={idx} className="flex justify-between items-center gap-4 bg-[var(--input-bg)] p-3 rounded-xl border border-[var(--border-main)] shadow-sm">
                  <label className="text-xs font-bold text-[var(--text-main)] flex-1 leading-relaxed">
                    {idx + 1}. {pert}
                  </label>
                  <div className="w-24 shrink-0">
                    <input 
                      type="number" 
                      min="1" 
                      max="4"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-center font-bold text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                      value={checks[idx]}
                      onChange={e => handleCheckChange(idx, e.target.value)}
                    />
                  </div>
                </div>
              ))}

              <div className="mt-6 border-l-4 border-l-rose-500 bg-rose-50 p-4 rounded-xl border border-rose-100">
                <label className="text-xs font-bold text-rose-700 block mb-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> Catatan Kerusakan
                </label>
                <Input 
                  placeholder="Ketik keterangan kerusakan di sini..." 
                  value={catatan}
                  onChange={e => setCatatan(e.target.value)}
                  className="bg-white border-rose-200 focus:border-rose-400 text-sm"
                />
              </div>
            </div>
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
            onChange={setSignatureData} 
          />

          <Button onClick={handleSubmit} className="w-full py-6 text-lg shadow-xl shadow-primary/20">
            Kirim Laporan ke Server
          </Button>
        </div>
      )}
    </div>
  );
}
