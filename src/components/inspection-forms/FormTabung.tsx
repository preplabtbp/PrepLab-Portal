import { toast } from 'sonner';
import React, { useState } from 'react';
import { uploadPhotoToDrive } from '../../sheets-api';
import { Card, Button, Input } from '../ui';
import { Camera, AlertCircle, FileText } from 'lucide-react';
import { InspectorSignatures, SignatureData } from '../InspectorSignatures';

export function FormTabung({ data, inspectorName, inspectorNik, onSubmit }: { data: any[], inspectorName: string, inspectorNik: string, onSubmit: (payload: any) => void }) {
  const [regTabung, setRegTabung] = useState('');
  const [nikInsp, setNikInsp] = useState(inspectorNik);
  const [namaAtasan, setNamaAtasan] = useState('');
  const [catatan, setCatatan] = useState('');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [signatureData, setSignatureData] = useState<SignatureData | null>(null);
  
  const [fotoBukti, setFotoBukti] = useState<string>('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const HARI_OPTIONS = ['Jumat', 'Sabtu', 'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis'];

  const handleAnswer = (qId: string, field: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [qId]: { ...prev[qId], [field]: value }
    }));
  };

  const handleHariChange = (qId: string, hari: string, isChecked: boolean) => {
    setAnswers(prev => {
      const currentHari = prev[qId]?.hari || [];
      const newHari = isChecked 
        ? [...currentHari, hari] 
        : currentHari.filter((h: string) => h !== hari);
      
      return {
        ...prev,
        [qId]: { ...prev[qId], hari: newHari }
      };
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
    if (!regTabung || !nikInsp || !namaAtasan) {
      toast.error("No. Registrasi, NIK, dan Nama Atasan WAJIB diisi.");
      return;
    }
    if (!fotoBukti) {
      toast.error("Foto Bukti Proses Inspeksi WAJIB dilampirkan.");
      return;
    }

    let hasError = false;
    let errorMessage = "";

    const payload: any[] = [];
    data.forEach(q => {
      const item = q.item.replace(/^\\d+\\.\\s*/, "").trim();
      const ans = answers[q.item] || { jawaban: 'YA' };
      const isTdk = ans.jawaban === 'TIDAK';
      const hariArr = ans.hari || [];
      const ket = (ans.ket || '').trim();

      if (isTdk) {
        if (hariArr.length === 0) {
          hasError = true;
          errorMessage = `Peringatan pada item:\n"${item}"\n\nAnda menjawab TIDAK, silakan pilih minimal 1 Hari Kendala.`;
        } else if (ket === "") {
          hasError = true;
          errorMessage = `Peringatan pada item:\n"${item}"\n\nAnda sudah memilih hari, tapi Catatan Keterangan/Detail masih KOSONG. Wajib diisi!`;
        }
      }

      payload.push({
        item,
        jawaban: ans.jawaban || 'YA',
        hari: isTdk && hariArr.length > 0 ? hariArr.join(", ") : "-",
        keterangan: isTdk ? ket : "-"
      });
    });

    if (hasError) {
      toast.error(errorMessage);
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

    onSubmit({
      payload,
      tabungMeta: { reg: regTabung, nik: nikInsp, atasan: namaAtasan },
      catatanUmum: catatan || "-",
      fotoProses: fotoBukti,
      signatures: signatureData
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Card className="border-t-4 border-t-primary space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-semibold text-primary block mb-1">No. Reg Tabung <span className="text-rose-500">*</span></label>
            <Input 
              placeholder="Contoh: TBG-001" 
              value={regTabung} 
              onChange={e => setRegTabung(e.target.value.toUpperCase())}
              className="font-bold border-primary/30"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-primary block mb-1">NIK Inspektor <span className="text-rose-500">*</span></label>
            <Input 
              value={nikInsp} 
              onChange={e => setNikInsp(e.target.value)}
              className="bg-slate-50 border-primary/30"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-primary block mb-1">Nama Atasan <span className="text-rose-500">*</span></label>
            <Input 
              placeholder="Cari Atasan..." 
              value={namaAtasan} 
              onChange={e => setNamaAtasan(e.target.value)}
              className="border-primary/30"
            />
          </div>
        </div>
      </Card>

      {data.map((q, idx) => {
        const ans = answers[q.item] || { jawaban: 'YA' };
        const isTdk = ans.jawaban === 'TIDAK';

        return (
          <Card key={idx} className="border-l-4 border-l-sky-500 p-4 space-y-4 bg-[var(--card-bg)] border-[var(--border-main)] text-[var(--text-main)]">
            <h6 className="font-bold text-[var(--text-main)] text-sm">{idx + 1}. {q.item}</h6>
            
            <div className="flex gap-2">
              <button
                onClick={() => handleAnswer(q.item, 'jawaban', 'YA')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg border ${ans.jawaban === 'YA' ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-[var(--card-bg)] text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'} transition-all`}
              >
                YA
              </button>
              <button
                onClick={() => handleAnswer(q.item, 'jawaban', 'TIDAK')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg border ${isTdk ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-[var(--card-bg)] text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-700/60 hover:bg-rose-50 dark:hover:bg-rose-950/30'} transition-all`}
              >
                TIDAK
              </button>
            </div>

            {isTdk && (
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl space-y-4 animate-in fade-in zoom-in-95 mt-2">
                <div>
                  <label className="text-xs font-semibold text-rose-700 block mb-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> Pilih Hari Kendala (Bisa &gt; 1) <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {HARI_OPTIONS.map(hari => {
                      const isChecked = (ans.hari || []).includes(hari);
                      return (
                        <button
                          key={hari}
                          onClick={() => handleHariChange(q.item, hari, !isChecked)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-md border ${isChecked ? 'bg-rose-600 text-white border-rose-700 shadow-sm' : 'bg-white text-rose-600 border-rose-300 hover:bg-rose-100'} transition-colors`}
                        >
                          {hari.substring(0, 3)}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-rose-700 block mb-1">Keterangan / Detail <span className="text-rose-500">*</span></label>
                  <Input 
                    placeholder="Ketik detail temuan..." 
                    value={ans.ket || ''}
                    onChange={e => handleAnswer(q.item, 'ket', e.target.value)}
                    className="bg-white border-rose-300 focus:border-rose-500 text-sm"
                  />
                </div>
              </div>
            )}
          </Card>
        );
      })}

      <Card className="border-t-4 border-t-primary">
        <label className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4" /> Catatan Hasil Inspeksi
        </label>
        <textarea 
          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-700 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm shadow-sm"
          rows={3}
          placeholder="Ketik catatan di sini..."
          value={catatan}
          onChange={e => setCatatan(e.target.value)}
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
        onChange={setSignatureData} 
      />

      <Button onClick={handleSubmit} className="w-full py-6 text-lg shadow-xl shadow-primary/20">
        Kirim Laporan ke Server
      </Button>
    </div>
  );
}
