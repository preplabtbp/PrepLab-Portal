import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  User, 
  Briefcase, 
  Calendar, 
  Phone, 
  MapPin, 
  FileText, 
  Activity, 
  AlertCircle,
  Clock,
  Building,
  CreditCard,
  HeartHandshake,
  Scale,
  ShieldAlert,
  Gavel,
  AlertOctagon,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { parseIndoDate, calculateDateDiffString } from '../lib/tenureUtils';

interface EmployeeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: any;
  inspectorNik: string;
  initialTab?: 'job' | 'personal' | 'attendance' | 'reasons' | 'counseling';
  onSuccess: (updatedEmployee: any) => void;
  mode?: 'edit' | 'add';
}

export function EmployeeEditModal({
  isOpen,
  onClose,
  employee,
  inspectorNik,
  initialTab = 'job',
  onSuccess,
  mode = 'edit'
}: EmployeeEditModalProps) {
  const [activeTab, setActiveTab] = useState<'job' | 'personal' | 'attendance' | 'reasons' | 'counseling'>(initialTab);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [attData, setAttData] = useState<Record<string, any>>({});
  const [counselData, setCounselData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'add') {
      setFormData({
        name: '',
        nik: '',
        ktp: '',
        pt: 'TBP',
        poh: 'Kawasi',
        sponsor: '',
        statusKaryawan: 'Active',
        statusKontrak: 'Permanent',
        tanggalEfektifTidakBekerja: '',
        tanggalAwalBergabung: '',
        tanggalJabatanBaru: '',
        masaKerja: '',
        masaKerjaJabatanTerakhir: '',
        masaKerjaJabatanSebelumnya: '',
        department: 'Preparation & Laboratory',
        section: 'Preparation',
        jobGrade: '',
        gol: 'I',
        jabatan: 'Crew, Preparation & Laboratory',
        tanggalPermanent: '',
        tempatLahir: '',
        tanggalLahir: '',
        phone: '',
        keluargaKandung: '',
        phoneKeluarga: '',
        orangTerdekat: '',
        phoneDarurat: '',
        alamatKtp: '',
        alamatDomisili: '',
        sisaCt: '0',
        jatuhTempoCt: '',
        jumlahCutiSite: '0'
      });

      setAttData({
        izin: '0',
        izinKhusus: '0',
        sakit: '0',
        alpa: '0',
        tanggalIzin: '',
        tanggalIzinKhusus: '',
        tanggalSakitSite: '',
        tanggalSakitLuar: '',
        tanggalAlpa: '',
        alasanIzin: '',
        alasanIzinKhusus: '',
        alasanSakitSite: '',
        alasanSakitLuar: ''
      });

      setCounselData({
        totalSp: '0',
        bulanKonseling: '',
        konseling1: '',
        konseling2: '',
        konseling3: '',
        st: '',
        sp1: '',
        sp2: '',
        sp3: '',
        sppt: '',
        tanggalSp: '',
        phk: '',
        masaBerlakuSanksi: '',
        masaPemulihan1: '',
        masaPemulihan2: '',
        alasanKonseling: '',
        alasanSp: '',
        keterangan: '',
        pernahSpSebelumnya: 'Tidak',
        pernahTerlibatSpdk: 'Tidak',
        kronologiSpdk: '',
        kategoriSpdk: '',
        tindakanSpdk: '',
        statusSanksi: 'Aman'
      });
      return;
    }

    if (employee && isOpen) {
      setFormData({
        name: employee.name || '',
        nik: employee.nik || '',
        ktp: employee.ktp || '',
        pt: employee.pt || '',
        poh: employee.poh || '',
        sponsor: employee.sponsor || '',
        statusKaryawan: employee.statusKaryawan || '',
        statusKontrak: employee.statusKontrak || '',
        tanggalEfektifTidakBekerja: employee.tanggalEfektifTidakBekerja || '',
        tanggalAwalBergabung: employee.tanggalAwalBergabung || '',
        tanggalJabatanBaru: employee.tanggalJabatanBaru || '',
        masaKerja: employee.masaKerja || '',
        masaKerjaJabatanTerakhir: employee.masaKerjaJabatanTerakhir || '',
        masaKerjaJabatanSebelumnya: employee.masaKerjaJabatanSebelumnya || '',
        department: employee.department || '',
        section: employee.section || '',
        jobGrade: employee.jobGrade || '',
        gol: employee.gol || '',
        jabatan: employee.jabatan || '',
        tanggalPermanent: employee.tanggalPermanent || '',
        tempatLahir: employee.tempatLahir || '',
        tanggalLahir: employee.tanggalLahir || '',
        phone: employee.phone || '',
        keluargaKandung: employee.keluargaKandung || '',
        phoneKeluarga: employee.phoneKeluarga || '',
        orangTerdekat: employee.orangTerdekat || '',
        phoneDarurat: employee.phoneDarurat || '',
        alamatKtp: employee.alamatKtp || '',
        alamatDomisili: employee.alamatDomisili || '',
        sisaCt: employee.sisaCt !== undefined && employee.sisaCt !== null ? String(employee.sisaCt) : '0',
        jatuhTempoCt: employee.jatuhTempoCt || '',
        jumlahCutiSite: employee.jumlahCutiSite !== undefined && employee.jumlahCutiSite !== null ? String(employee.jumlahCutiSite) : '0'
      });

      const rawAtt26 = employee.attendance2026 || employee.attendance?.['2026'] || employee.attendance?.[2026] || {};
      setAttData({
        izin: rawAtt26.izin !== undefined ? String(rawAtt26.izin) : '0',
        izinKhusus: rawAtt26.izinKhusus !== undefined ? String(rawAtt26.izinKhusus) : '0',
        sakit: rawAtt26.sakit !== undefined ? String(rawAtt26.sakit) : '0',
        alpa: rawAtt26.alpa !== undefined ? String(rawAtt26.alpa) : (rawAtt26.alpha !== undefined ? String(rawAtt26.alpha) : '0'),
        tanggalIzin: Array.isArray(rawAtt26.tanggalIzin) ? rawAtt26.tanggalIzin.join('\n') : (rawAtt26.tanggalIzin || ''),
        tanggalIzinKhusus: Array.isArray(rawAtt26.tanggalIzinKhusus) ? rawAtt26.tanggalIzinKhusus.join('\n') : (rawAtt26.tanggalIzinKhusus || ''),
        tanggalSakitSite: Array.isArray(rawAtt26.tanggalSakitSite) ? rawAtt26.tanggalSakitSite.join('\n') : (rawAtt26.tanggalSakitSite || ''),
        tanggalSakitLuar: Array.isArray(rawAtt26.tanggalSakitLuar) ? rawAtt26.tanggalSakitLuar.join('\n') : (rawAtt26.tanggalSakitLuar || ''),
        tanggalAlpa: Array.isArray(rawAtt26.tanggalAlpa) 
          ? rawAtt26.tanggalAlpa.join('\n') 
          : (rawAtt26.tanggalAlpa || rawAtt26.tanggalAlpha || rawAtt26.tanggal_alpa || rawAtt26.tanggal_alpha || (typeof rawAtt26.alpa === 'string' && (rawAtt26.alpa.includes('-') || rawAtt26.alpa.includes('\n')) ? rawAtt26.alpa : '') || ''),
        alasanIzin: Array.isArray(rawAtt26.alasanIzin) ? rawAtt26.alasanIzin.join('\n') : (rawAtt26.alasanIzin || ''),
        alasanIzinKhusus: Array.isArray(rawAtt26.alasanIzinKhusus) ? rawAtt26.alasanIzinKhusus.join('\n') : (rawAtt26.alasanIzinKhusus || ''),
        alasanSakitSite: Array.isArray(rawAtt26.alasanSakitSite) ? rawAtt26.alasanSakitSite.join('\n') : (rawAtt26.alasanSakitSite || ''),
        alasanSakitLuar: Array.isArray(rawAtt26.alasanSakitLuar) ? rawAtt26.alasanSakitLuar.join('\n') : (rawAtt26.alasanSakitLuar || '')
      });

      const rawCounsel = employee.counselingSpdk || employee.counseling || {};
      setCounselData({
        totalSp: String(rawCounsel.totalSp ?? rawCounsel.total_sp ?? '0'),
        bulanKonseling: rawCounsel.bulanKonseling ?? rawCounsel.bulan_konseling ?? rawCounsel.bulan ?? '',
        konseling1: rawCounsel.konseling1 ?? rawCounsel.konseling_1 ?? '',
        konseling2: rawCounsel.konseling2 ?? rawCounsel.konseling_2 ?? '',
        konseling3: rawCounsel.konseling3 ?? rawCounsel.konseling_3 ?? '',
        st: rawCounsel.st ?? '',
        sp1: rawCounsel.sp1 ?? rawCounsel.sp_1 ?? '',
        sp2: rawCounsel.sp2 ?? rawCounsel.sp_2 ?? '',
        sp3: rawCounsel.sp3 ?? rawCounsel.sp_3 ?? '',
        sppt: rawCounsel.sppt ?? rawCounsel.sp_pt ?? '',
        tanggalSp: rawCounsel.tanggalSp ?? rawCounsel.tanggal_sp ?? '',
        phk: rawCounsel.phk ?? '',
        masaBerlakuSanksi: rawCounsel.masaBerlakuSanksi ?? rawCounsel.masa_berlaku_sanksi ?? rawCounsel.masaBerlaku ?? rawCounsel.masa_berlaku ?? rawCounsel.periodeBerlaku ?? rawCounsel.tanggalBerlaku ?? '',
        masaPemulihan1: rawCounsel.masaPemulihan1 ?? rawCounsel.masa_pemulihan_1 ?? rawCounsel.pemulihan1 ?? rawCounsel.pemulihan_1 ?? '',
        masaPemulihan2: rawCounsel.masaPemulihan2 ?? rawCounsel.masa_pemulihan_2 ?? rawCounsel.pemulihan2 ?? rawCounsel.pemulihan_2 ?? '',
        alasanKonseling: rawCounsel.alasanKonseling ?? rawCounsel.alasan_konseling ?? rawCounsel.alasanPembinaan ?? rawCounsel.alasan_pembinaan ?? '',
        alasanSp: rawCounsel.alasanSp ?? rawCounsel.alasan_sp ?? rawCounsel.alasanSuratPeringatan ?? rawCounsel.alasan_surat_peringatan ?? rawCounsel.alasan ?? rawCounsel.alasanSanksi ?? '',
        keterangan: rawCounsel.keterangan ?? rawCounsel.keterangan_sp ?? rawCounsel.keteranganSp ?? rawCounsel.catatan ?? '',
        pernahSpSebelumnya: rawCounsel.pernahSpSebelumnya ?? rawCounsel.pernah_sp_sebelumnya ?? rawCounsel.pernahSp ?? 'Tidak',
        pernahTerlibatSpdk: rawCounsel.pernahTerlibatSpdk ?? rawCounsel.pernah_terlibat_spdk ?? rawCounsel.spdk ?? 'Tidak',
        kronologiSpdk: rawCounsel.kronologiSpdk ?? rawCounsel.kronologi_spdk ?? rawCounsel.kronologiKejadianSpdk ?? rawCounsel.kronologi ?? '',
        kategoriSpdk: rawCounsel.kategoriSpdk ?? rawCounsel.kategori_spdk ?? rawCounsel.kategoriSanksiSpdk ?? rawCounsel.kategori ?? '',
        tindakanSpdk: rawCounsel.tindakanSpdk ?? rawCounsel.tindakan_spdk ?? rawCounsel.tindakanDisiplinSpdk ?? rawCounsel.tindakan ?? '',
        statusSanksi: rawCounsel.statusSanksi ?? rawCounsel.status_sanksi ?? 'Aman'
      });
    }
  }, [employee, isOpen, initialTab, mode]);

  if (!isOpen || (mode !== 'add' && !employee)) return null;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAutoCalculateTenure = () => {
    const dohDate = parseIndoDate(formData.tanggalAwalBergabung);
    if (!dohDate) {
      toast.error('Isi Tanggal Awal Bergabung (DOH) terlebih dahulu untuk menghitung masa kerja.');
      return;
    }
    const now = new Date();
    const tglBaruDate = parseIndoDate(formData.tanggalJabatanBaru);

    // 1. Total Masa Kerja
    const total = calculateDateDiffString(dohDate, now);
    
    // 2. Masa Kerja Jabatan Sekarang & Sebelumnya
    let sekarang = total;
    let sebelumnya = '-';

    if (tglBaruDate && tglBaruDate.getTime() > dohDate.getTime()) {
      sekarang = calculateDateDiffString(tglBaruDate, now);
      sebelumnya = calculateDateDiffString(dohDate, tglBaruDate);
    }

    setFormData(prev => ({
      ...prev,
      masaKerja: total,
      masaKerjaJabatanTerakhir: sekarang,
      masaKerjaJabatanSebelumnya: sebelumnya
    }));

    toast.success('Masa kerja berhasil dihitung otomatis!', {
      description: `Total: ${total} | Sekarang: ${sekarang} | Sebelumnya: ${sebelumnya}`
    });
  };

  const handleAttChange = (field: string, value: string) => {
    setAttData(prev => ({ ...prev, [field]: value }));
  };

  const handleCounselChange = (field: string, value: string) => {
    setCounselData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const isAdd = mode === 'add';

    try {
      const payload = {
        ...formData,
        attendance2026: {
          ...attData
        },
        counselingSpdk: {
          ...counselData
        },
        editorNik: inspectorNik
      };

      const url = isAdd ? '/api/employees' : `/api/employees/${employee.nik}`;
      const method = isAdd ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-nik': inspectorNik
        },
        body: JSON.stringify(payload)
      });

      const json = await res.json();

      if (!res.ok || json.status === 'error') {
        throw new Error(json.message || `Gagal ${isAdd ? 'menambahkan' : 'menyimpan perubahan'} data karyawan`);
      }

      toast.success(isAdd ? 'Karyawan baru berhasil ditambahkan!' : 'Data karyawan berhasil diperbarui!', {
        description: isAdd
          ? `Karyawan ${formData.name} (${formData.nik}) berhasil tersimpan di database.`
          : `Perubahan untuk ${formData.name || employee?.name} telah disimpan di database.`
      });

      if (json.data) {
        onSuccess(json.data);
      }
      onClose();
    } catch (err: any) {
      toast.error('Gagal memproses data: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-teal-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#22a7b8] text-white flex items-center justify-center font-black text-sm shadow-md">
              {mode === 'add' ? '+' : ((employee?.name || formData.name || 'E').charAt(0).toUpperCase())}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-800">
                  {mode === 'add' ? 'Tambah Karyawan Baru' : 'Edit Data Karyawan'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fef6e7] text-[#9a5b02] border border-[#fad79a]">
                  Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                {mode === 'add' 
                  ? 'Input master data karyawan baru sesuai struktur data.csv'
                  : `${employee?.name || formData.name} • NIK: ${employee?.nik || formData.nik}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto bg-slate-50/80 py-2">
          <button
            type="button"
            onClick={() => setActiveTab('job')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'job'
                ? 'bg-[#22a7b8] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Pekerjaan & Jabatan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'personal'
                ? 'bg-[#22a7b8] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Data Pribadi & Kontak</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'attendance'
                ? 'bg-[#22a7b8] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Rekap & Tanggal Absensi (2026)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reasons')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'reasons'
                ? 'bg-[#22a7b8] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Alasan Absensi (4 Kategori)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('counseling')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'counseling'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-purple-800 hover:bg-purple-50 border border-purple-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5 text-purple-600" />
            <span>Konseling &amp; SPDK</span>
          </button>
        </div>

        {/* Form Body */}
        <form id="edit-employee-form" onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: PEKERJAAN & JABATAN */}
          {activeTab === 'job' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>NIK Karyawan {mode === 'add' ? '*' : '(Terkunci)'}</span>
                    {mode === 'add' && <span className="text-[10px] text-emerald-600 font-normal">Wajib Unik</span>}
                  </label>
                  <input
                    type="text"
                    value={formData.nik || ''}
                    disabled={mode !== 'add'}
                    required={mode === 'add'}
                    onChange={(e) => handleInputChange('nik', e.target.value.toUpperCase())}
                    placeholder="Contoh: M0403240177"
                    className={`w-full px-3.5 py-2 rounded-xl border font-mono text-xs font-bold ${
                      mode === 'add'
                        ? 'border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#22a7b8]'
                        : 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Jabatan
                  </label>
                  <input
                    type="text"
                    value={formData.jabatan || ''}
                    onChange={(e) => handleInputChange('jabatan', e.target.value)}
                    placeholder="Contoh: Crew, Preparation & Laboratory"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Perusahaan (PT)
                  </label>
                  <input
                    type="text"
                    value={formData.pt || ''}
                    onChange={(e) => handleInputChange('pt', e.target.value)}
                    placeholder="GPS / TBP / GTS"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Bagian / Section
                  </label>
                  <input
                    type="text"
                    value={formData.section || ''}
                    onChange={(e) => handleInputChange('section', e.target.value)}
                    placeholder="Contoh: Wet, Preparation"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Departemen
                  </label>
                  <input
                    type="text"
                    value={formData.department || ''}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    placeholder="Contoh: Quality Assurance"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Job Grade
                  </label>
                  <input
                    type="text"
                    value={formData.jobGrade || ''}
                    onChange={(e) => handleInputChange('jobGrade', e.target.value)}
                    placeholder="Contoh: S1.1"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Golongan
                  </label>
                  <input
                    type="text"
                    value={formData.gol || ''}
                    onChange={(e) => handleInputChange('gol', e.target.value)}
                    placeholder="Contoh: I"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Status Karyawan
                  </label>
                  <input
                    type="text"
                    value={formData.statusKaryawan || ''}
                    onChange={(e) => handleInputChange('statusKaryawan', e.target.value)}
                    placeholder="Active / Inactive / Resigned"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Status Kontrak
                  </label>
                  <input
                    type="text"
                    value={formData.statusKontrak || ''}
                    onChange={(e) => handleInputChange('statusKontrak', e.target.value)}
                    placeholder="Permanent / PKWTT / PKWT"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Sponsor
                  </label>
                  <input
                    type="text"
                    value={formData.sponsor || ''}
                    onChange={(e) => handleInputChange('sponsor', e.target.value)}
                    placeholder="Nama Sponsor"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    POH (Point of Hire)
                  </label>
                  <input
                    type="text"
                    value={formData.poh || ''}
                    onChange={(e) => handleInputChange('poh', e.target.value)}
                    placeholder="Contoh: Obi / Manado / Jakarta"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    DOH Awal (Tgl Bergabung)
                  </label>
                  <input
                    type="text"
                    value={formData.tanggalAwalBergabung || ''}
                    onChange={(e) => handleInputChange('tanggalAwalBergabung', e.target.value)}
                    placeholder="YYYY-MM-DD atau DD-MMM-YYYY"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tgl Jabatan Baru
                  </label>
                  <input
                    type="text"
                    value={formData.tanggalJabatanBaru || ''}
                    onChange={(e) => handleInputChange('tanggalJabatanBaru', e.target.value)}
                    placeholder="YYYY-MM-DD atau DD-MMM-YYYY"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#22a7b8]" />
                      <span>Masa Kerja Jabatan (Sekarang & Sebelumnya)</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoCalculateTenure}
                      className="text-[11px] font-bold text-[#135e69] bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                      title="Hitung otomatis berdasarkan DOH Awal dan Tgl Jabatan Baru"
                    >
                      <RefreshCw className="w-3 h-3 text-[#22a7b8]" />
                      <span>Hitung Otomatis dari Tanggal</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Masa Kerja Total
                      </label>
                      <input
                        type="text"
                        value={formData.masaKerja || ''}
                        onChange={(e) => handleInputChange('masaKerja', e.target.value)}
                        placeholder="Contoh: 4 Tahun 7 Bulan"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
                        <span>Jabatan Sekarang</span>
                        <span className="text-[10px] text-emerald-600 font-bold">Terakhir</span>
                      </label>
                      <input
                        type="text"
                        value={formData.masaKerjaJabatanTerakhir || ''}
                        onChange={(e) => handleInputChange('masaKerjaJabatanTerakhir', e.target.value)}
                        placeholder="Contoh: 2 Tahun 11 Bulan"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
                        <span>Jabatan Sebelumnya</span>
                        <span className="text-[10px] text-amber-600 font-bold">Riwayat</span>
                      </label>
                      <input
                        type="text"
                        value={formData.masaKerjaJabatanSebelumnya || ''}
                        onChange={(e) => handleInputChange('masaKerjaJabatanSebelumnya', e.target.value)}
                        placeholder="Contoh: 1 Tahun 8 Bulan atau -"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tanggal Permanen
                  </label>
                  <input
                    type="text"
                    value={formData.tanggalPermanent || ''}
                    onChange={(e) => handleInputChange('tanggalPermanent', e.target.value)}
                    placeholder="YYYY-MM-DD atau DD-MMM-YYYY"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tgl Efektif Tidak Bekerja (Jika Non-Aktif)
                  </label>
                  <input
                    type="text"
                    value={formData.tanggalEfektifTidakBekerja || ''}
                    onChange={(e) => handleInputChange('tanggalEfektifTidakBekerja', e.target.value)}
                    placeholder="Kosongkan jika masih aktif"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Sisa Cuti (CT)
                  </label>
                  <input
                    type="number"
                    value={formData.sisaCt || '0'}
                    onChange={(e) => handleInputChange('sisaCt', e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Jatuh Tempo CT
                  </label>
                  <input
                    type="text"
                    value={formData.jatuhTempoCt || ''}
                    onChange={(e) => handleInputChange('jatuhTempoCt', e.target.value)}
                    placeholder="Contoh: 06 Maret"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Jumlah Cuti Site (per Periode)</span>
                    {Number(formData.jumlahCutiSite || 0) >= 2 && (
                      <span className="text-[10px] text-rose-600 font-extrabold flex items-center gap-1">
                        <AlertOctagon className="w-3 h-3 text-rose-600" />
                        Melebihi Limit
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.jumlahCutiSite ?? '0'}
                    onChange={(e) => handleInputChange('jumlahCutiSite', e.target.value)}
                    placeholder="0"
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 ${
                      Number(formData.jumlahCutiSite || 0) >= 2
                        ? 'border-rose-400 bg-rose-50/50 text-rose-950 focus:ring-rose-500'
                        : 'border-slate-200 focus:ring-[#22a7b8]'
                    }`}
                  />
                  {Number(formData.jumlahCutiSite || 0) >= 2 && (
                    <p className="text-[10.5px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                      Melebihi Limit pengambilan Cuti Site
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DATA PRIBADI & KONTAK */}
          {activeTab === 'personal' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    NIK KTP
                  </label>
                  <input
                    type="text"
                    value={formData.ktp || ''}
                    onChange={(e) => handleInputChange('ktp', e.target.value)}
                    placeholder="Nomor KTP 16 digit"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tempat Lahir
                  </label>
                  <input
                    type="text"
                    value={formData.tempatLahir || ''}
                    onChange={(e) => handleInputChange('tempatLahir', e.target.value)}
                    placeholder="Kota / Tempat Lahir"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tanggal Lahir
                  </label>
                  <input
                    type="text"
                    value={formData.tanggalLahir || ''}
                    onChange={(e) => handleInputChange('tanggalLahir', e.target.value)}
                    placeholder="YYYY-MM-DD atau DD-MMM-YYYY"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nomor Telp. Pribadi
                  </label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Keluarga Kandung (Hubungan)
                  </label>
                  <input
                    type="text"
                    value={formData.keluargaKandung || ''}
                    onChange={(e) => handleInputChange('keluargaKandung', e.target.value)}
                    placeholder="Contoh: Ibu / Ayah / Istri"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    No. Telephone Keluarga Kandung
                  </label>
                  <input
                    type="text"
                    value={formData.phoneKeluarga || ''}
                    onChange={(e) => handleInputChange('phoneKeluarga', e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Orang Terdekat yang Bisa Dihubungi
                  </label>
                  <input
                    type="text"
                    value={formData.orangTerdekat || ''}
                    onChange={(e) => handleInputChange('orangTerdekat', e.target.value)}
                    placeholder="Contoh: Teman / Paman / Kerabat"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    No. Telp Darurat Orang Terdekat
                  </label>
                  <input
                    type="text"
                    value={formData.phoneDarurat || ''}
                    onChange={(e) => handleInputChange('phoneDarurat', e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Alamat Sesuai KTP
                  </label>
                  <textarea
                    rows={2}
                    value={formData.alamatKtp || ''}
                    onChange={(e) => handleInputChange('alamatKtp', e.target.value)}
                    placeholder="Alamat lengkap sesuai KTP..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Alamat Domisili (Tempat Tinggal Saat Ini)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.alamatDomisili || ''}
                    onChange={(e) => handleInputChange('alamatDomisili', e.target.value)}
                    placeholder="Alamat domisili saat ini (misal mess atau desa sekitar)..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REKAP ABSENSI & TANGGAL (2026) */}
          {activeTab === 'attendance' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800 flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  Catatan: Rincian tanggal dapat diisi per baris (tekan Enter). Total jumlah hari otomatis disesuaikan.
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-200/80">
                  <label className="block text-[11px] font-bold text-teal-800 mb-1 uppercase">Total Izin</label>
                  <input
                    type="number"
                    value={attData.izin || '0'}
                    onChange={(e) => handleAttChange('izin', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-teal-300 text-xs font-bold bg-white text-teal-900"
                  />
                </div>
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200/80">
                  <label className="block text-[11px] font-bold text-indigo-800 mb-1 uppercase">Izin Khusus</label>
                  <input
                    type="number"
                    value={attData.izinKhusus || '0'}
                    onChange={(e) => handleAttChange('izinKhusus', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-300 text-xs font-bold bg-white text-indigo-900"
                  />
                </div>
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80">
                  <label className="block text-[11px] font-bold text-amber-800 mb-1 uppercase">Total Sakit</label>
                  <input
                    type="number"
                    value={attData.sakit || '0'}
                    onChange={(e) => handleAttChange('sakit', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 text-xs font-bold bg-white text-amber-900"
                  />
                </div>
                <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200/80">
                  <label className="block text-[11px] font-bold text-rose-800 mb-1 uppercase">Total Alpa</label>
                  <input
                    type="number"
                    value={attData.alpa || '0'}
                    onChange={(e) => handleAttChange('alpa', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-rose-300 text-xs font-bold bg-white text-rose-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-teal-900 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Tanggal Izin</span>
                    <span className="text-[10px] text-teal-600 font-normal">Satu tanggal per baris</span>
                  </label>
                  <textarea
                    rows={4}
                    value={attData.tanggalIzin || ''}
                    onChange={(e) => handleAttChange('tanggalIzin', e.target.value)}
                    placeholder="15-Agu-2026&#10;16-Agu-2026"
                    className="w-full px-3.5 py-2 rounded-xl border border-teal-200 bg-teal-50/20 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Tanggal Izin Khusus</span>
                    <span className="text-[10px] text-indigo-600 font-normal">Satu tanggal per baris</span>
                  </label>
                  <textarea
                    rows={4}
                    value={attData.tanggalIzinKhusus || ''}
                    onChange={(e) => handleAttChange('tanggalIzinKhusus', e.target.value)}
                    placeholder="13-Feb-2026&#10;14-Feb-2026"
                    className="w-full px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50/20 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Tanggal Sakit Site (SS)</span>
                    <span className="text-[10px] text-amber-600 font-normal">Satu tanggal per baris</span>
                  </label>
                  <textarea
                    rows={4}
                    value={attData.tanggalSakitSite || ''}
                    onChange={(e) => handleAttChange('tanggalSakitSite', e.target.value)}
                    placeholder="07-Jan-2026&#10;08-Jan-2026"
                    className="w-full px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50/20 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-orange-900 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Tanggal Sakit Luar (SL)</span>
                    <span className="text-[10px] text-orange-600 font-normal">Satu tanggal per baris</span>
                  </label>
                  <textarea
                    rows={4}
                    value={attData.tanggalSakitLuar || ''}
                    onChange={(e) => handleAttChange('tanggalSakitLuar', e.target.value)}
                    placeholder="20-Mar-2026"
                    className="w-full px-3.5 py-2 rounded-xl border border-orange-200 bg-orange-50/20 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-rose-900 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Tanggal Alpa</span>
                    <span className="text-[10px] text-rose-600 font-normal">Satu tanggal per baris</span>
                  </label>
                  <textarea
                    rows={3}
                    value={attData.tanggalAlpa || ''}
                    onChange={(e) => handleAttChange('tanggalAlpa', e.target.value)}
                    placeholder="05-Apr-2026"
                    className="w-full px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50/20 text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ALASAN ABSENSI (4 KATEGORI) */}
          {activeTab === 'reasons' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Alasan Izin */}
                <div className="p-4 rounded-2xl border border-teal-200 bg-teal-50/30">
                  <label className="block text-xs font-bold text-teal-900 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                      Alasan Izin
                    </span>
                    <span className="text-[10px] text-teal-700 font-normal">Satu alasan per baris</span>
                  </label>
                  <textarea
                    rows={4}
                    value={attData.alasanIzin || ''}
                    onChange={(e) => handleAttChange('alasanIzin', e.target.value)}
                    placeholder="15-Aug-26 s/d 17-Aug-26 (3 Hari) - Acara Keluarga&#10;08-May-26 s/d 08-May-26 (1 Hari) - Urusan Pribadi"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-teal-300 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* 2. Alasan Izin Khusus */}
                <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/30">
                  <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                      Alasan Izin Khusus
                    </span>
                    <span className="text-[10px] text-indigo-700 font-normal">Satu alasan per baris</span>
                  </label>
                  <textarea
                    rows={4}
                    value={attData.alasanIzinKhusus || ''}
                    onChange={(e) => handleAttChange('alasanIzinKhusus', e.target.value)}
                    placeholder="1. 13-Feb-26 s/d 17-Feb-26 (5 Hari) - Menikah&#10;2. 07-May-26 s/d 07-May-26 (1 Hari) - Wisuda"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-300 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* 3. Alasan Sakit Site (SS) */}
                <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/30">
                  <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      Alasan Sakit Site (SS)
                    </span>
                    <span className="text-[10px] text-amber-700 font-normal">Satu alasan per baris</span>
                  </label>
                  <textarea
                    rows={4}
                    value={attData.alasanSakitSite || ''}
                    onChange={(e) => handleAttChange('alasanSakitSite', e.target.value)}
                    placeholder="26-Feb-26 s/d 27-Feb-26 (2 Hari) - Sakit Demam&#10;1. 07-Jan-26 s/d 14-Jan-26 (8 Hari) - Ispa & asma"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* 4. Alasan Sakit Luar (SL) */}
                <div className="p-4 rounded-2xl border border-orange-200 bg-orange-50/30">
                  <label className="block text-xs font-bold text-orange-900 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                      Alasan Sakit Luar (SL)
                    </span>
                    <span className="text-[10px] text-orange-700 font-normal">Satu alasan per baris</span>
                  </label>
                  <textarea
                    rows={4}
                    value={attData.alasanSakitLuar || ''}
                    onChange={(e) => handleAttChange('alasanSakitLuar', e.target.value)}
                    placeholder="10-May-26 s/d 14-May-26 (5 Hari) - Rawat Inap RS Luar Site"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-orange-300 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: KONSELING, SANKSI & SPDK */}
          {activeTab === 'counseling' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Header Info Box */}
              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-purple-600 text-white shadow-2xs">
                    <Scale className="w-5 h-5" />
                  </span>
                  <div>
                    <h4 className="text-xs font-extrabold text-purple-900 uppercase">
                      Pengaturan Konseling, Surat Peringatan &amp; SPDK
                    </h4>
                    <p className="text-[11px] text-purple-700 mt-0.5">
                      Kelola catatan pembinaan karyawan, status level sanksi, masa pemulihan, dan insiden SPDK.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Status Sanksi:</span>
                  <select
                    value={counselData.statusSanksi || 'Aman'}
                    onChange={(e) => handleCounselChange('statusSanksi', e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-purple-300 bg-white font-extrabold text-xs text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Aman">Aman (Disiplin Baik)</option>
                    <option value="Konseling I">Konseling I</option>
                    <option value="Konseling II">Konseling II</option>
                    <option value="Konseling III">Konseling III</option>
                    <option value="Surat Teguran (ST)">Surat Teguran (ST)</option>
                    <option value="SP I">Surat Peringatan I (SP I)</option>
                    <option value="SP II">Surat Peringatan II (SP II)</option>
                    <option value="SP III">Surat Peringatan III (SP III)</option>
                    <option value="PHK">PHK (Terminasi)</option>
                    <option value="SPDK">SPDK (Pelanggaran Disiplin Kerja)</option>
                  </select>
                </div>
              </div>

              {/* General Disciplinary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Total SP / Akumulasi
                  </label>
                  <input
                    type="text"
                    value={counselData.totalSp || '0'}
                    onChange={(e) => handleCounselChange('totalSp', e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-extrabold text-xs text-rose-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Bulan Konseling
                  </label>
                  <input
                    type="text"
                    value={counselData.bulanKonseling || ''}
                    onChange={(e) => handleCounselChange('bulanKonseling', e.target.value)}
                    placeholder="Contoh: Februari 2026"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Pernah SP/ST Sebelumnya?
                  </label>
                  <select
                    value={counselData.pernahSpSebelumnya || 'Tidak'}
                    onChange={(e) => handleCounselChange('pernahSpSebelumnya', e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-bold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Tidak">Tidak</option>
                    <option value="Ya">Ya (Pernah)</option>
                  </select>
                </div>
              </div>

              {/* Tahapan Konseling I, II, III */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <h5 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-600" />
                  Tanggal Pelaksanaan Konseling / Pembinaan
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Konseling I (Tanggal)</label>
                    <input
                      type="text"
                      value={counselData.konseling1 || ''}
                      onChange={(e) => handleCounselChange('konseling1', e.target.value)}
                      placeholder="05-Feb-2026"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Konseling II (Tanggal)</label>
                    <input
                      type="text"
                      value={counselData.konseling2 || ''}
                      onChange={(e) => handleCounselChange('konseling2', e.target.value)}
                      placeholder="12-Feb-2026"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Konseling III (Tanggal)</label>
                    <input
                      type="text"
                      value={counselData.konseling3 || ''}
                      onChange={(e) => handleCounselChange('konseling3', e.target.value)}
                      placeholder="19-Feb-2026"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Jenjang Penerbitan Surat Peringatan & ST */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <h5 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Gavel className="w-3.5 h-3.5 text-amber-600" />
                  Tanggal Penerbitan Surat Peringatan &amp; Sanksi
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-yellow-800 mb-1">ST (Surat Teguran)</label>
                    <input
                      type="text"
                      value={counselData.st || ''}
                      onChange={(e) => handleCounselChange('st', e.target.value)}
                      placeholder="01-Feb-2026"
                      className="w-full px-3 py-1.5 rounded-xl border border-yellow-200 bg-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-amber-800 mb-1">SP I (Peringatan 1)</label>
                    <input
                      type="text"
                      value={counselData.sp1 || ''}
                      onChange={(e) => handleCounselChange('sp1', e.target.value)}
                      placeholder="15-Feb-2026"
                      className="w-full px-3 py-1.5 rounded-xl border border-amber-200 bg-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-orange-800 mb-1">SP II (Peringatan 2)</label>
                    <input
                      type="text"
                      value={counselData.sp2 || ''}
                      onChange={(e) => handleCounselChange('sp2', e.target.value)}
                      placeholder="-"
                      className="w-full px-3 py-1.5 rounded-xl border border-orange-200 bg-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-rose-800 mb-1">SP III (Peringatan 3)</label>
                    <input
                      type="text"
                      value={counselData.sp3 || ''}
                      onChange={(e) => handleCounselChange('sp3', e.target.value)}
                      placeholder="-"
                      className="w-full px-3 py-1.5 rounded-xl border border-rose-200 bg-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-rose-900 mb-1">SPPT (SP Terakhir)</label>
                    <input
                      type="text"
                      value={counselData.sppt || ''}
                      onChange={(e) => handleCounselChange('sppt', e.target.value)}
                      placeholder="-"
                      className="w-full px-3 py-1.5 rounded-xl border border-rose-300 bg-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-rose-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-rose-950 mb-1">PHK (Terminasi)</label>
                    <input
                      type="text"
                      value={counselData.phk || ''}
                      onChange={(e) => handleCounselChange('phk', e.target.value)}
                      placeholder="-"
                      className="w-full px-3 py-1.5 rounded-xl border border-rose-300 bg-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-rose-900"
                    />
                  </div>
                </div>
              </div>

              {/* Alasan Konseling / Pembinaan */}
              <div>
                <label className="block text-xs font-bold text-teal-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <HeartHandshake className="w-4 h-4 text-teal-600" />
                  Alasan Konseling / Pembinaan Karyawan
                </label>
                <textarea
                  rows={2}
                  value={counselData.alasanKonseling || ''}
                  onChange={(e) => handleCounselChange('alasanKonseling', e.target.value)}
                  placeholder="Contoh: Keterlambatan kedatangan shift kerja, pembinaan kepatuhan SOP / APD, evaluasi koordinasi tim..."
                  className="w-full px-3.5 py-2 rounded-xl border border-teal-200 bg-teal-50/20 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Alasan SP & Keterangan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Alasan Surat Peringatan (Pelanggaran)
                  </label>
                  <textarea
                    rows={3}
                    value={counselData.alasanSp || ''}
                    onChange={(e) => handleCounselChange('alasanSp', e.target.value)}
                    placeholder="Contoh: Terlambat Masuk Kerja Lebih Dari 3 Kali / Alpa tanpa izin"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Keterangan / Catatan Tambahan
                  </label>
                  <textarea
                    rows={3}
                    value={counselData.keterangan || ''}
                    onChange={(e) => handleCounselChange('keterangan', e.target.value)}
                    placeholder="Contoh: Konseling telah dilakukan oleh Foreman dan dievaluasi bulanan"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Section Khusus SPDK (Sanksi Pelanggaran Disiplin Kerja) */}
              <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/30 space-y-4">
                <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                  <h5 className="text-xs font-extrabold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertOctagon className="w-4 h-4 text-purple-600" />
                    Penanganan Kasus SPDK (Pelanggaran Disiplin Kerja)
                  </h5>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-purple-800">Pernah Terlibat SPDK:</span>
                    <select
                      value={counselData.pernahTerlibatSpdk || 'Tidak'}
                      onChange={(e) => handleCounselChange('pernahTerlibatSpdk', e.target.value)}
                      className="px-2.5 py-1 rounded-lg border border-purple-300 bg-white font-bold text-xs text-purple-900 focus:outline-none"
                    >
                      <option value="Tidak">Tidak</option>
                      <option value="Ya">Ya (Terlibat)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-purple-900 mb-1">
                      Kategori Sanksi SPDK
                    </label>
                    <input
                      type="text"
                      value={counselData.kategoriSpdk || ''}
                      onChange={(e) => handleCounselChange('kategoriSpdk', e.target.value)}
                      placeholder="Contoh: Pelanggaran Disiplin Ringan / Sedang / Berat"
                      className="w-full px-3.5 py-2 rounded-xl border border-purple-200 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-purple-900 mb-1">
                      Tindakan Disiplin SPDK
                    </label>
                    <input
                      type="text"
                      value={counselData.tindakanSpdk || ''}
                      onChange={(e) => handleCounselChange('tindakanSpdk', e.target.value)}
                      placeholder="Contoh: Penerbitan SP I & Evaluasi Kerja"
                      className="w-full px-3.5 py-2 rounded-xl border border-purple-200 bg-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-900 mb-1">
                    Kronologi Kejadian SPDK
                  </label>
                  <textarea
                    rows={4}
                    value={counselData.kronologiSpdk || ''}
                    onChange={(e) => handleCounselChange('kronologiSpdk', e.target.value)}
                    placeholder="Tuliskan rincian kronologi kejadian insiden pelanggaran disiplin kerja di sini..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-purple-300 bg-white text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 leading-relaxed"
                  />
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500">
            Perubahan data akan langsung disimpan ke database server.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>

            <button
              type="submit"
              form="edit-employee-form"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#22a7b8] hover:bg-[#1b8f9e] transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : (mode === 'add' ? 'Simpan Karyawan Baru' : 'Simpan Perubahan')}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
