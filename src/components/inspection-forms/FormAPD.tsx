import { toast } from 'sonner';
import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Input, Select } from '../ui';
import { Camera, Users, AlertTriangle, Search } from 'lucide-react';
import { getEmployees, uploadPhotoToDrive } from '../../sheets-api';
import { InspectorSignatures, SignatureData } from '../InspectorSignatures';

const APD_ITEMS = ['Seragam', 'Helm', 'Sepatu', 'Masker', 'Ear Plug', 'Kacamata'];

export function FormAPD({ formId, inspectorName, inspectorNik, onSubmit, autoFillAllYa }: { formId: string, inspectorName: string, inspectorNik: string, onSubmit: (payload: any) => void, autoFillAllYa?: number }) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [manualEmployees, setManualEmployees] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [waktuKerja, setWaktuKerja] = useState('');
  const [loading, setLoading] = useState(true);
  const [fotoBukti, setFotoBukti] = useState<string>('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [tabelData, setTabelData] = useState<Record<string, any>>({});
  const [signatureData, setSignatureData] = useState<SignatureData | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const data = await getEmployees();
      setEmployees(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const { filteredEmployees } = useMemo(() => {
    let div = '';
    let grp = '';

    if (formId === "17") { div = "Laboratory"; grp = "A"; }
    else if (formId === "18") { div = "Laboratory"; grp = "B"; }
    else if (formId === "19") { div = "Preparation"; grp = "A"; }
    else if (formId === "20") { div = "Preparation"; grp = "B"; }
    else if (formId === "21") { div = "Maintenance"; grp = "Nonshift"; }

    let list = [];
    if (waktuKerja) {
      list = employees.filter(e => {
        const ptStr = (e.pt || '').toString().trim().toUpperCase();
        const nikStr = (e.nik || '').toString().trim().toUpperCase();
        const isGts = ptStr === 'GTS' || nikStr.startsWith('03') || nikStr.startsWith('M03');
        if (isGts) return false; // Strictly exclude GTS employees for TBP & GPS inspections
        const norm = (v: string) => (v || "").toString().trim().toLowerCase();
        const daftarLab = ["laboratory", "qa", "inventory control", "administration"];
        
        let matchDivisi = false;
        if (div === "Laboratory") {
          matchDivisi = daftarLab.some(kw => norm(e.divisi).includes(kw));
        } else {
          matchDivisi = norm(e.divisi).includes(norm(div));
        }

        if (matchDivisi) {
          if (div === "Maintenance") return true;
          if (norm(e.grup) === norm(grp)) return true;
          if (norm(e.grup) === "nonshift" && waktuKerja === "Pagi") return true;
        }
        return false;
      });
    }

    return { filteredEmployees: list, div, grp };
  }, [employees, formId, waktuKerja]);

  useEffect(() => {
    // initialize table data when employees change
    const initialData: Record<string, any> = { ...tabelData };
    [...filteredEmployees, ...manualEmployees].forEach(e => {
      if (!initialData[e.nama]) {
        initialData[e.nama] = {
          nama: e.nama,
          jabatan: e.jabatan,
          kehadiran: 'Hadir',
          apd: [false, false, false, false, false, false], // false = OK, true = Rusak/Tidak Pakai
          ket: ''
        };
      }
    });
    setTabelData(initialData);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredEmployees, manualEmployees]);

  useEffect(() => {
    if (autoFillAllYa && autoFillAllYa > 0) {
      const newTabelData: Record<string, any> = {};
      [...filteredEmployees, ...manualEmployees].forEach(e => {
        const key = e.nama || e.nik;
        if (key) {
          newTabelData[key] = {
            nama: e.nama,
            jabatan: e.jabatan,
            kehadiran: 'Hadir',
            apd: [false, false, false, false, false, false],
            ket: ''
          };
        }
      });
      setTabelData(newTabelData);
    }
  }, [autoFillAllYa, filteredEmployees, manualEmployees]);

  const handleRowChange = (nama: string, field: string, value: any) => {
    setTabelData(prev => ({
      ...prev,
      [nama]: { ...prev[nama], [field]: value }
    }));
  };

  const handleApdChange = (nama: string, index: number, isChecked: boolean) => {
    setTabelData(prev => {
      const newApd = [...prev[nama].apd];
      newApd[index] = isChecked;
      return {
        ...prev,
        [nama]: { ...prev[nama], apd: newApd }
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
    if (!waktuKerja) {
      toast("Pilih Waktu Kerja terlebih dahulu.");
      return;
    }
    
    // validation
    const currentRows = Object.values(tabelData).filter(r => 
      filteredEmployees.find(fe => fe.nama === r.nama) || 
      manualEmployees.find(me => me.nama === r.nama)
    );
    let hasError = false;
    currentRows.forEach(r => {
      if (r.kehadiran !== "Hadir" && r.kehadiran !== "Cuti" && r.kehadiran !== "Off" && !r.ket.trim()) {
        hasError = true;
        toast.error(`Keterangan WAJIB diisi untuk personil: ${r.nama} (Status: ${r.kehadiran})`);
      } else if (r.kehadiran === "Hadir" && r.apd.includes(true) && !r.ket.trim()) {
        hasError = true;
        toast.error(`Keterangan WAJIB diisi untuk personil: ${r.nama} karena ada APD bermasalah.`);
      }
    });
    if (hasError) return;

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

    onSubmit({
      payload: currentRows,
      waktuKerja: waktuKerja,
      fotoProses: fotoBukti,
      signatures: signatureData
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Card className="border-l-4 border-l-primary">
        <label className="text-sm font-semibold text-primary block mb-2">Waktu Kerja <span className="text-rose-500">*</span></label>
        <Select value={waktuKerja} onChange={e => setWaktuKerja(e.target.value)} className="w-full">
          <option value="">-- Pilih Waktu --</option>
          <option value="Pagi">Pagi</option>
          <option value="Malam">Malam</option>
        </Select>
      </Card>

      {waktuKerja && (
        <>
          <div className="bg-amber-50 border-l-4 border-amber-500 p-3 rounded-lg flex gap-3 text-amber-800 text-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p><strong>Note:</strong> Beri tanda <strong>(X)</strong> pada APD bermasalah dan tulis keterangan.</p>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl">Memuat data personil...</div>
            ) : [...filteredEmployees, ...manualEmployees].length === 0 ? (
              <div className="p-6 text-center text-rose-500 font-semibold bg-rose-50 rounded-xl">Data personil tidak ditemukan.</div>
            ) : (
              [...filteredEmployees, ...manualEmployees].map((emp, empIdx) => {
                const row = tabelData[emp.nama];
                if (!row) return null;
                const isAbsent = row.kehadiran !== "Hadir";
                const hasApdIssue = row.apd.includes(true);
                const hasWarning = isAbsent || hasApdIssue;
                
                // Set the default expanded state - maybe only first one, or none. Let's make it manageable by creating an accordion wrapper, but for simplicity here we can use details HTML tag or simple state.
                // We'll use a local state mechanism via standard React pattern if possible, but since we are mapping, we can just use the HTML5 <details> element for a quick native accordion, or standard div.
                // Let's implement a clean custom accordion relying on pure CSS or HTML native details/summary for best performance on long lists.
                
                return (
                  <details key={emp.nama} className={`group bg-[var(--card-bg)] text-[var(--text-main)] rounded-xl shadow-sm border ${hasWarning ? 'border-amber-300 dark:border-amber-700' : 'border-[var(--border-main)]'} overflow-hidden`}>
                    <summary className={`p-3 pr-4 flex justify-between items-center cursor-pointer list-none select-none ${hasWarning ? 'bg-amber-500/10' : ''}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${hasWarning ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' : 'bg-[var(--input-bg)] text-[var(--text-muted)]'}`}>
                          {empIdx + 1}
                        </div>
                        <div>
                          <h4 className="font-bold text-[var(--text-main)] text-sm leading-tight">{emp.nama}</h4>
                          <div className="flex gap-2 mt-1 xl:mt-0.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isAbsent ? 'bg-[var(--input-bg)] text-[var(--text-muted)]' : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'}`}>
                              {row.kehadiran}
                            </span>
                            {hasApdIssue && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                                ❌ APD Bermasalah
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-[var(--text-muted)] group-open:rotate-180 transition-transform">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </div>
                    </summary>

                    <div className="p-4 bg-[var(--input-bg)] border-t border-[var(--border-main)] space-y-4">
                      <div>
                        <label className="text-xs font-bold text-[var(--text-main)] block mb-1">Kehadiran</label>
                        <Select 
                          value={row.kehadiran} 
                          onChange={e => handleRowChange(emp.nama, 'kehadiran', e.target.value)}
                          className="w-full text-sm mb-0 bg-[var(--card-bg)] text-[var(--text-main)] border-[var(--border-main)]"
                        >
                          <option value="Hadir">Hadir</option>
                          <option value="Pindah ke shift lain">Pindah ke shift lain</option>
                          <option value="Off">Off</option>
                          <option value="Cuti">Cuti</option>
                          <option value="Sakit">Sakit</option>
                          <option value="Izin">Izin</option>
                          <option value="Lain-lain">Lain-lain</option>
                        </Select>
                      </div>

                      {!isAbsent && (
                        <div className="bg-[var(--card-bg)] p-3 rounded-lg border border-[var(--border-main)]">
                          <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-2 text-center">
                            Kondisi APD (Pilih ❌ jika Bermasalah)
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {APD_ITEMS.map((item, idx) => (
                              <div key={item} className="bg-[var(--input-bg)] px-2 py-1.5 rounded-md border border-[var(--border-main)] flex items-center justify-between">
                                <span className="text-[11px] font-bold text-[var(--text-main)]">{item}</span>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleApdChange(emp.nama, idx, false)}
                                    className={`w-6 h-6 rounded flex items-center justify-center text-[10px] ${!row.apd[idx] ? 'bg-emerald-500 text-white font-bold' : 'bg-white text-emerald-600 border border-slate-200 hover:bg-emerald-50'}`}
                                  >
                                    ✔
                                  </button>
                                  <button
                                    onClick={() => handleApdChange(emp.nama, idx, true)}
                                    className={`w-6 h-6 rounded flex items-center justify-center text-[10px] ${row.apd[idx] ? 'bg-rose-500 text-white font-bold' : 'bg-white text-rose-600 border border-slate-200 hover:bg-rose-50'}`}
                                  >
                                    ❌
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">
                          Keterangan {((isAbsent && row.kehadiran !== "Cuti" && row.kehadiran !== "Off") || row.apd.includes(true)) ? <span className="text-rose-500">*</span> : ''}
                        </label>
                        <Input 
                          value={row.ket}
                          onChange={e => handleRowChange(emp.nama, 'ket', e.target.value)}
                          className="w-full text-sm"
                          placeholder={((isAbsent && row.kehadiran !== "Cuti" && row.kehadiran !== "Off") || row.apd.includes(true)) ? 'Wajib diisi...' : 'Opsional...'}
                          disabled={row.kehadiran === "Cuti" || row.kehadiran === "Off"}
                        />
                      </div>
                    </div>
                  </details>
                );
              })
            )}
          </div>

          <Card className="border-l-4 border-l-blue-500 bg-white p-4 overflow-visible">
            <h4 className="font-bold text-sm text-blue-800 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Tambah Personil Lain
            </h4>
            <div className="relative">
              <div className="flex relative items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3" />
                <Input
                  placeholder="Cari nama karyawan..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full text-sm pl-9"
                />
              </div>
              {searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl z-50">
                  {employees
                    .filter(e => 
                      !filteredEmployees.some(fe => fe.nama === e.nama) && 
                      !manualEmployees.some(me => me.nama === e.nama) &&
                      e.nama.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .slice(0, 5)
                    .map(e => (
                      <div
                        key={e.nama}
                        onClick={() => {
                          setManualEmployees(prev => [...prev, e]);
                          setSearchQuery('');
                        }}
                        className="px-3 py-2 border-b border-slate-100 hover:bg-blue-50 cursor-pointer flex flex-col"
                      >
                        <span className="font-semibold text-sm text-slate-800">{e.nama}</span>
                        <span className="text-xs text-slate-500">{e.divisi} - {e.jabatan}</span>
                      </div>
                    ))}
                  {employees.filter(e => 
                      !filteredEmployees.some(fe => fe.nama === e.nama) && 
                      !manualEmployees.some(me => me.nama === e.nama) &&
                      e.nama.toLowerCase().includes(searchQuery.toLowerCase())
                    ).length === 0 && (
                      <div className="px-3 py-2 text-sm text-slate-500 text-center">Bukan karyawan / Sudah di list</div>
                  )}
                </div>
              )}
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
            Kirim Laporan APD ke Server
          </Button>
        </>
      )}
    </div>
  );
}
