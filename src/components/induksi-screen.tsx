import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Input, Select } from './ui';
import { ChevronLeft, Loader2, Save, UploadCloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { WhatsAppModal } from './whatsapp-modal';

export function InduksiScreen() {
  const navigate = useNavigate();
  const [perusahaan, setPerusahaan] = useState('');
  const [tipeInduksi, setTipeInduksi] = useState('');
  
  const [namaPeserta, setNamaPeserta] = useState('');
  const [nikPeserta, setNikPeserta] = useState('');
  const [jabatanPeserta, setJabatanPeserta] = useState('');
  const [divisi, setDivisi] = useState('Prep');
  
  const [namaInduktor, setNamaInduktor] = useState('');
  const [nikInduktor, setNikInduktor] = useState('');
  const [jabatanInduktor, setJabatanInduktor] = useState('');

  const [materi, setMateri] = useState<Record<string, boolean>>({});
  const [fotoDokumentasi, setFotoDokumentasi] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waMessageText, setWaMessageText] = useState('');

  const padPeserta = useRef<any>(null);
  const padInduktor = useRef<any>(null);

  // Fetch employees for autocomplete
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-autocomplete'],
    queryFn: async () => {
      const res = await fetch('/api/employees');
      if (!res.ok) throw new Error('Failed to fetch employees');
      return res.json();
    }
  });

  const handleNamaPesertaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNamaPeserta(val);
    const emp = employees.find((em: any) => em.name === val);
    if (emp) {
      if (emp.nik) setNikPeserta(emp.nik);
      if (emp.jabatan) setJabatanPeserta(emp.jabatan);
      if (emp.section) {
        // Map section to match options (Prep, Lab, Adm, QA, IC, MT)
        const sec = emp.section.toLowerCase();
        if (sec.includes('prep')) setDivisi('Prep');
        else if (sec.includes('lab')) setDivisi('Lab');
        else if (sec.includes('adm')) setDivisi('Adm');
        else if (sec.includes('qa') || sec.includes('quality')) setDivisi('QA');
        else if (sec.includes('ic') || sec.includes('inventory')) setDivisi('IC');
        else if (sec.includes('mt') || sec.includes('maintenance')) setDivisi('MT');
      }
      if (emp.pt) {
        if (emp.pt.includes('TBP')) setPerusahaan('PT. TBP');
        else if (emp.pt.includes('GPS')) setPerusahaan('PT. GPS');
      }
    }
  };

  const handleNamaInduktorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNamaInduktor(val);
    const emp = employees.find((em: any) => em.name === val);
    if (emp) {
      if (emp.nik) setNikInduktor(emp.nik);
      if (emp.jabatan) setJabatanInduktor(emp.jabatan);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFotoDokumentasi(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async () => {
    if (!tipeInduksi) return toast.error('Pilih Tipe Induksi terlebih dahulu.');
    if (!perusahaan) return toast.error('Pilih Perusahaan terlebih dahulu.');
    if (!namaPeserta || !namaInduktor) return toast.error('Pastikan Nama Peserta dan Induktor diisi.');
    
    if (padPeserta.current?.isEmpty()) return toast.error('Tanda Tangan Peserta wajib diisi.');
    if (padInduktor.current?.isEmpty()) return toast.error('Tanda Tangan Induktor wajib diisi.');

    setIsSubmitting(true);
    try {
      const ttdPeserta = padPeserta.current.getCanvas().toDataURL('image/png');
      const ttdInduktor = padInduktor.current.getCanvas().toDataURL('image/png');

      const payload: any = {
        tipe_A: tipeInduksi === 'lengkap' ? '✔' : '',
        tipe_B: tipeInduksi === 'singkat' ? '✔' : '',
        perusahaan,
        namaPeserta,
        nik: nikPeserta,
        jabatanPeserta,
        divisi,
        namaInduktor,
        nikInduktor,
        jabatanInduktor,
        ttdPeserta,
        ttdInduktor,
        fotoDokumentasi
      };

      for (let i = 1; i <= 16; i++) {
        payload['m' + i] = materi['m' + i] ? '✔' : '';
      }

      const res = await fetch('/api/induksi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Terjadi kesalahan saat memproses data');
      
      toast.success('Data berhasil di-submit!');
      
      if (result.waMessageText) {
         setWaMessageText(result.waMessageText);
      } else {
         navigate('/');
      }
      
      // Reset Form
      setPerusahaan('');
      setTipeInduksi('');
      setNamaPeserta(''); setNikPeserta(''); setJabatanPeserta('');
      setNamaInduktor(''); setNikInduktor(''); setJabatanInduktor('');
      setMateri({});
      setFotoDokumentasi(null);
      padPeserta.current?.clear();
      padInduktor.current?.clear();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMateri = (key: string) => {
    setMateri(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6">
      <WhatsAppModal 
        isOpen={!!waMessageText} 
        onClose={() => {
           setWaMessageText('');
           navigate('/');
        }}
        messageText={waMessageText}
        title="Induksi Berhasil"
        description="Berhasil disimpan. Kirim laporan ke WhatsApp?"
      />
      <div className="flex items-center gap-4">
        <Button variant="secondary" onClick={() => navigate('/')}>
          <ChevronLeft className="w-4 h-4 mr-2" /> Kembali
        </Button>
        <h1 className="text-2xl font-bold text-gray-800">Form Induksi Internal</h1>
      </div>

      <Card className="p-6 space-y-6 bg-white">
        <div>
          <h2 className="text-lg font-semibold text-primary mb-4 border-b pb-2">1. Tipe Induksi & Perusahaan</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tipe Induksi <span className="text-red-500">*</span></label>
              <Select value={tipeInduksi} onChange={e => setTipeInduksi(e.target.value)}>
                <option value="">-- Pilih Tipe Induksi --</option>
                <option value="lengkap">Karyawan Baru / Tamu (Induksi Lengkap)</option>
                <option value="singkat">Pulang Cuti / Tahunan (Induksi Singkat)</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Perusahaan <span className="text-red-500">*</span></label>
              <Select value={perusahaan} onChange={e => setPerusahaan(e.target.value)}>
                <option value="">-- Pilih Perusahaan --</option>
                <option value="PT. TBP">PT. TBP</option>
                <option value="PT. GPS">PT. GPS</option>
              </Select>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-primary mb-4 border-b pb-2">2. Data Peserta</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nama Lengkap <span className="text-red-500">*</span></label>
              <Input 
                value={namaPeserta || ""} 
                onChange={handleNamaPesertaChange} 
                placeholder="Nama Peserta..." 
                list="peserta-list"
              />
              <datalist id="peserta-list">
                {employees.map((e: any) => (
                  <option key={e.id} value={e.name}>{e.nik} - {e.jabatan}</option>
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">NIK</label>
              <Input value={nikPeserta || ""} onChange={e => setNikPeserta(e.target.value)} placeholder="NIK..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Jabatan</label>
              <Input value={jabatanPeserta || ""} onChange={e => setJabatanPeserta(e.target.value)} placeholder="Jabatan..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Section</label>
              <Select value={divisi} onChange={e => setDivisi(e.target.value)}>
                <option value="Prep">Preparation</option>
                <option value="Lab">Laboratory</option>
                <option value="Adm">Administration</option>
                <option value="QA">Quality Assurance</option>
                <option value="IC">Inventory Control</option>
                <option value="MT">Maintenance</option>
              </Select>
            </div>
          </div>
        </div>

        {tipeInduksi && (
          <div>
            <h2 className="text-lg font-semibold text-primary mb-4 border-b pb-2">3. Materi Induksi</h2>
            <p className="text-sm text-gray-500 italic mb-4">* Berikan Tanda centang pada materi induksi jika sudah dibaca & dipahami</p>
            
            <div className="bg-slate-50 p-4 rounded-lg border space-y-2">
              {tipeInduksi === 'lengkap' ? (
                <>
                  <div className="flex items-center gap-2"><input type="checkbox" checked={materi.m5 || false} onChange={() => toggleMateri('m5')} className="w-4 h-4 accent-primary" /> <label>Penyampaian K3LH Prep & Lab</label></div>
                  <div className="flex items-center gap-2"><input type="checkbox" checked={materi.m6 || false} onChange={() => toggleMateri('m6')} className="w-4 h-4 accent-primary" /> <label>Pengenalan SOP Prep & Lab</label></div>
                  <div className="flex items-center gap-2"><input type="checkbox" checked={materi.m7 || false} onChange={() => toggleMateri('m7')} className="w-4 h-4 accent-primary" /> <label>Pengenalan personil Prep & Lab</label></div>
                  <div className="flex items-center gap-2"><input type="checkbox" checked={materi.m8 || false} onChange={() => toggleMateri('m8')} className="w-4 h-4 accent-primary" /> <label>Pengenalan area Prep & Lab</label></div>
                  <div className="flex items-center gap-2"><input type="checkbox" checked={materi.m9 || false} onChange={() => toggleMateri('m9')} className="w-4 h-4 accent-primary" /> <label>Pengenalan chemical handling</label></div>
                  <div className="flex items-center gap-2"><input type="checkbox" checked={materi.m10 || false} onChange={() => toggleMateri('m10')} className="w-4 h-4 accent-primary" /> <label>Tata cara pengisian KTA/TTA</label></div>
                  <div className="flex items-center gap-2"><input type="checkbox" checked={materi.m11 || false} onChange={() => toggleMateri('m11')} className="w-4 h-4 accent-primary" /> <label>Pengenalan area yang akan di akses</label></div>
                  <div className="flex items-center gap-2"><input type="checkbox" checked={materi.m12 || false} onChange={() => toggleMateri('m12')} className="w-4 h-4 accent-primary" /> <label>Penyampaian planning kerja</label></div>
                  <div className="flex items-center gap-2"><input type="checkbox" checked={materi.m13 || false} onChange={() => toggleMateri('m13')} className="w-4 h-4 accent-primary" /> <label>Penyampaian & pengesahan jobdesc</label></div>
                  <div className="flex items-center gap-2"><input type="checkbox" checked={materi.m16 || false} onChange={() => toggleMateri('m16')} className="w-4 h-4 accent-primary" /> <label>Penyampaian Kebijakan Perusahaan</label></div>
                  <div className="flex items-center gap-2"><input type="checkbox" checked={materi.m14 || false} onChange={() => toggleMateri('m14')} className="w-4 h-4 accent-primary" /> <label>Penyampaian prosedur administrasi yang berlaku</label></div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2"><input type="checkbox" checked={materi.m1 || false} onChange={() => toggleMateri('m1')} className="w-4 h-4 accent-primary" /> <label>Penyampaian K3LH Prep & Lab</label></div>
                  <div className="flex items-center gap-2"><input type="checkbox" checked={materi.m2 || false} onChange={() => toggleMateri('m2')} className="w-4 h-4 accent-primary" /> <label>Penyegaran SOP & APD</label></div>
                  <div className="flex items-center gap-2"><input type="checkbox" checked={materi.m3 || false} onChange={() => toggleMateri('m3')} className="w-4 h-4 accent-primary" /> <label>Penyampaian info update Prep & Lab</label></div>
                  <div className="flex items-center gap-2"><input type="checkbox" checked={materi.m4 || false} onChange={() => toggleMateri('m4')} className="w-4 h-4 accent-primary" /> <label>Tata cara pengisian KTA/TTA</label></div>
                  <div className="flex items-center gap-2"><input type="checkbox" checked={materi.m15 || false} onChange={() => toggleMateri('m15')} className="w-4 h-4 accent-primary" /> <label>Penyampaian prosedur administrasi yang berlaku</label></div>
                </>
              )}
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">Tanda Tangan Peserta <span className="text-red-500">*</span></label>
              <div className="border rounded-md bg-gray-50 mb-2">
                <SignatureCanvas 
                  ref={padPeserta} 
                  penColor="black" 
                  canvasProps={{ className: 'w-full h-40' }} 
                />
              </div>
              <Button variant="secondary" onClick={() => padPeserta.current?.clear()}>Hapus TTD Peserta</Button>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold text-primary mb-4 border-b pb-2">4. Data Induktor / Pelatih</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nama Induktor <span className="text-red-500">*</span></label>
              <Input 
                value={namaInduktor || ""} 
                onChange={handleNamaInduktorChange} 
                placeholder="Nama Induktor..." 
                list="induktor-list"
              />
              <datalist id="induktor-list">
                {employees.map((e: any) => (
                  <option key={e.id} value={e.name}>{e.nik} - {e.jabatan}</option>
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">NIK Induktor</label>
              <Input value={nikInduktor || ""} onChange={e => setNikInduktor(e.target.value)} placeholder="NIK Induktor..." />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Jabatan Induktor</label>
              <Input value={jabatanInduktor || ""} onChange={e => setJabatanInduktor(e.target.value)} placeholder="Jabatan Induktor..." />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Tanda Tangan Induktor <span className="text-red-500">*</span></label>
            <div className="border rounded-md bg-gray-50 mb-2">
              <SignatureCanvas 
                ref={padInduktor} 
                penColor="black" 
                canvasProps={{ className: 'w-full h-40' }} 
              />
            </div>
            <Button variant="secondary" onClick={() => padInduktor.current?.clear()}>Hapus TTD Induktor</Button>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-primary mb-4 border-b pb-2">5. Dokumentasi Inspeksi</h2>
          <div>
            <label className="block text-sm font-medium mb-2">Lampirkan Foto Proses (Opsional)</label>
            <Input type="file" accept="image/*" onChange={handlePhotoUpload} />
            {fotoDokumentasi && (
              <div className="mt-4">
                <img src={fotoDokumentasi} alt="Dokumentasi" className="max-h-64 rounded-md border shadow-sm mx-auto" />
              </div>
            )}
          </div>
        </div>

        <Button className="w-full h-12 text-base" onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sedang memproses dokumen...</>
          ) : (
            <><Save className="w-5 h-5 mr-2" /> Kirim & Buat Dokumen</>
          )}
        </Button>
      </Card>
    </motion.div>
  );
}
