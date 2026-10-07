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
  HeartHandshake
} from 'lucide-react';
import { toast } from 'sonner';

interface EmployeeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: any;
  inspectorNik: string;
  onSuccess: (updatedEmployee: any) => void;
}

export function EmployeeEditModal({
  isOpen,
  onClose,
  employee,
  inspectorNik,
  onSuccess
}: EmployeeEditModalProps) {
  const [activeTab, setActiveTab] = useState<'job' | 'personal' | 'attendance' | 'reasons'>('job');
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [attData, setAttData] = useState<Record<string, any>>({});

  useEffect(() => {
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
        jatuhTempoCt: employee.jatuhTempoCt || ''
      });

      const rawAtt26 = employee.attendance2026 || employee.attendance?.['2026'] || employee.attendance?.[2026] || {};
      setAttData({
        izin: rawAtt26.izin !== undefined ? String(rawAtt26.izin) : '0',
        izinKhusus: rawAtt26.izinKhusus !== undefined ? String(rawAtt26.izinKhusus) : '0',
        sakit: rawAtt26.sakit !== undefined ? String(rawAtt26.sakit) : '0',
        alpa: rawAtt26.alpa !== undefined ? String(rawAtt26.alpa) : '0',
        tanggalIzin: Array.isArray(rawAtt26.tanggalIzin) ? rawAtt26.tanggalIzin.join('\n') : (rawAtt26.tanggalIzin || ''),
        tanggalIzinKhusus: Array.isArray(rawAtt26.tanggalIzinKhusus) ? rawAtt26.tanggalIzinKhusus.join('\n') : (rawAtt26.tanggalIzinKhusus || ''),
        tanggalSakitSite: Array.isArray(rawAtt26.tanggalSakitSite) ? rawAtt26.tanggalSakitSite.join('\n') : (rawAtt26.tanggalSakitSite || ''),
        tanggalSakitLuar: Array.isArray(rawAtt26.tanggalSakitLuar) ? rawAtt26.tanggalSakitLuar.join('\n') : (rawAtt26.tanggalSakitLuar || ''),
        tanggalAlpa: Array.isArray(rawAtt26.tanggalAlpa) ? rawAtt26.tanggalAlpa.join('\n') : (rawAtt26.tanggalAlpa || ''),
        alasanIzin: Array.isArray(rawAtt26.alasanIzin) ? rawAtt26.alasanIzin.join('\n') : (rawAtt26.alasanIzin || ''),
        alasanIzinKhusus: Array.isArray(rawAtt26.alasanIzinKhusus) ? rawAtt26.alasanIzinKhusus.join('\n') : (rawAtt26.alasanIzinKhusus || ''),
        alasanSakitSite: Array.isArray(rawAtt26.alasanSakitSite) ? rawAtt26.alasanSakitSite.join('\n') : (rawAtt26.alasanSakitSite || ''),
        alasanSakitLuar: Array.isArray(rawAtt26.alasanSakitLuar) ? rawAtt26.alasanSakitLuar.join('\n') : (rawAtt26.alasanSakitLuar || '')
      });
    }
  }, [employee, isOpen]);

  if (!isOpen || !employee) return null;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAttChange = (field: string, value: string) => {
    setAttData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        ...formData,
        attendance2026: {
          ...attData
        },
        editorNik: inspectorNik
      };

      const res = await fetch(`/api/employees/${employee.nik}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-nik': inspectorNik
        },
        body: JSON.stringify(payload)
      });

      const json = await res.json();

      if (!res.ok || json.status === 'error') {
        throw new Error(json.message || 'Gagal menyimpan perubahan data karyawan');
      }

      toast.success('Data karyawan berhasil diperbarui di database!', {
        description: `Perubahan untuk ${formData.name || employee.name} telah disimpan.`
      });

      if (json.data) {
        onSuccess(json.data);
      }
      onClose();
    } catch (err: any) {
      toast.error('Gagal menyimpan data: ' + err.message);
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
              {employee.name ? employee.name.charAt(0).toUpperCase() : 'E'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-800">
                  Edit Data Karyawan
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fef6e7] text-[#9a5b02] border border-[#fad79a]">
                  Khusus Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                {employee.name} • NIK: {employee.nik}
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
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    NIK Karyawan (Read-Only)
                  </label>
                  <input
                    type="text"
                    value={formData.nik || ''}
                    disabled
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-mono text-xs font-bold cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Jabatan Baru
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

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Masa Kerja
                  </label>
                  <input
                    type="text"
                    value={formData.masaKerja || ''}
                    onChange={(e) => handleInputChange('masaKerja', e.target.value)}
                    placeholder="Contoh: 4 Tahun 7 Bulan"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Masa Kerja Jabatan Terakhir
                  </label>
                  <input
                    type="text"
                    value={formData.masaKerjaJabatanTerakhir || ''}
                    onChange={(e) => handleInputChange('masaKerjaJabatanTerakhir', e.target.value)}
                    placeholder="Contoh: 1 Tahun 2 Bulan"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
                  />
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
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
