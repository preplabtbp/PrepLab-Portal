import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  FileText, 
  Send, 
  RotateCcw, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  User, 
  ShieldCheck, 
  Upload, 
  Image as ImageIcon, 
  Paperclip, 
  Search, 
  ExternalLink, 
  ArrowLeft, 
  Info, 
  Sparkles, 
  AlertCircle, 
  Check, 
  ChevronRight,
  Eye,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';

interface Supervisor {
  nik: string;
  name: string;
  jabatan: string;
  gol: string;
  jobGrade?: string;
  section: string;
  shift?: string;
}

interface EmployeeMaster {
  nik: string;
  name: string;
  jabatan?: string;
  section?: string;
  shift?: string;
  gol?: string;
  avatar?: string;
}

interface EmployeeLeaveFormScreenProps {
  inspectorName?: string;
  inspectorNik?: string;
  userProfile?: any;
  onNav?: (tab: string) => void;
  onBack?: () => void;
  // Jika di-embed inline (misal di Home Page)
  isEmbedded?: boolean;
}

const SECTION_OPTIONS = [
  'Preparasi',
  'Laboratorium',
  'Administration',
  'Maintenance',
  'Inventory Control',
  'Quality Assurance',
  'General'
];

const SHIFT_OPTIONS = ['Shift A', 'Shift B', 'Nonshift'];
const JAM_SHIFT_OPTIONS = ['Siang', 'Malam', 'Regular Nonshift'];

export const TEMPAT_TINGGAL_OPTIONS = [
  'Nirwana (Mess)',
  'Kampung Kawasi (Ecovillage)',
  'Kampung Kawasi (Lama)',
  'Lainnya'
];

const ALASAN_PRESETS = [
  'Sakit (Demam, Flu, Nyeri Badan, atau Keluhan Fisik)',
  'Izin Keperluan Keluarga / Kepentingan Rumah Tangga',
  'Izin Acara Pernikahan (Keluarga / Pribadi)',
  'Izin Duka Cita (Keluarga Meninggal Dunia)',
  'Izin Pelayanan Ibadah / Kegiatan Keagamaan',
  'Izin Istri Melahirkan / Pendampingan Persalinan',
  'Keperluan Pengurusan Berkas / Administrasi Mendesak'
];

export function EmployeeLeaveFormScreen({
  inspectorName = '',
  inspectorNik = '',
  userProfile,
  onNav,
  onBack,
  isEmbedded = false
}: EmployeeLeaveFormScreenProps) {
  // Master Data
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [employees, setEmployees] = useState<EmployeeMaster[]>([]);
  const [loadingSupervisors, setLoadingSupervisors] = useState(false);

  // Form Fields
  const [nik, setNik] = useState(inspectorNik || userProfile?.nik || '');
  const [name, setName] = useState(inspectorName || userProfile?.name || '');
  const [jabatan, setJabatan] = useState(userProfile?.jabatan || 'Crew, Preparation & Laboratory');
  const [section, setSection] = useState('Preparasi');
  const [shift, setShift] = useState('Shift A');
  const [jamShift, setJamShift] = useState('Siang');
  const [tempatTinggal, setTempatTinggal] = useState('Nirwana (Mess)');
  const [tempatTinggalCustom, setTempatTinggalCustom] = useState('');
  const [awalAbsensi, setAwalAbsensi] = useState(() => new Date().toISOString().slice(0, 10));
  const [akhirAbsensi, setAkhirAbsensi] = useState(() => new Date().toISOString().slice(0, 10));
  const [jumlahHari, setJumlahHari] = useState(1);
  const [alasanPreset, setAlasanPreset] = useState(ALASAN_PRESETS[0]);
  const [alasanCustom, setAlasanCustom] = useState('');
  const [isAlasanOther, setIsAlasanOther] = useState(false);

  // Autosearch Pengawas Gol II - V
  const [pengawasSearch, setPengawasSearch] = useState('');
  const [selectedPengawas, setSelectedPengawas] = useState<Supervisor | null>(null);
  const [isPengawasDropdownOpen, setIsPengawasDropdownOpen] = useState(false);
  const pengawasDropdownRef = useRef<HTMLDivElement>(null);

  // Autosearch Employee (untuk Switch / bantuan izin rekan)
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const employeeDropdownRef = useRef<HTMLDivElement>(null);

  // Lampiran File
  const [lampiranBase64, setLampiranBase64] = useState<string | null>(null);
  const [lampiranFileName, setLampiranFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string>('nik-name');
  const [lastSubmittedData, setLastSubmittedData] = useState<any>(null);

  // Initial populate from user profile
  useEffect(() => {
    if (userProfile) {
      if (userProfile.nik) setNik(userProfile.nik);
      if (userProfile.name) setName(userProfile.name);
      if (userProfile.jabatan) setJabatan(userProfile.jabatan);
      if (userProfile.section) {
        const sec = userProfile.section.toLowerCase();
        if (sec.includes('prep')) setSection('Preparasi');
        else if (sec.includes('lab')) setSection('Laboratorium');
        else if (sec.includes('admin')) setSection('Administration');
        else if (sec.includes('maint')) setSection('Maintenance');
        else if (sec.includes('inv')) setSection('Inventory Control');
        else if (sec.includes('qa')) setSection('Quality Assurance');
      }
      if (userProfile.shift) {
        const sh = userProfile.shift.toUpperCase();
        if (sh.includes('A')) setShift('Shift A');
        else if (sh.includes('B')) setShift('Shift B');
        else setShift('Nonshift');
      }
    }
  }, [userProfile]);

  // Load Supervisors (Gol II - V) & Employees
  useEffect(() => {
    let mounted = true;
    const fetchSupervisors = async () => {
      setLoadingSupervisors(true);
      try {
        const res = await fetch('/api/employee-leaves/supervisors');
        if (res.ok) {
          const json = await res.json();
          if (mounted && json.data) {
            setSupervisors(json.data);
          }
        }
      } catch (err) {
        console.warn('Gagal memuat daftar pengawas:', err);
      } finally {
        if (mounted) setLoadingSupervisors(false);
      }
    };

    const fetchEmployees = async () => {
      try {
        const res = await fetch('/api/employees');
        if (res.ok) {
          const json = await res.json();
          const emps = Array.isArray(json) ? json : (json.data || json.employees || []);
          if (mounted) setEmployees(emps);
        }
      } catch (err) {
        // fallback
      }
    };

    fetchSupervisors();
    fetchEmployees();

    return () => { mounted = false; };
  }, []);

  // Recalculate duration when dates change
  useEffect(() => {
    if (awalAbsensi && akhirAbsensi) {
      const d1 = new Date(awalAbsensi).getTime();
      const d2 = new Date(akhirAbsensi).getTime();
      if (!isNaN(d1) && !isNaN(d2)) {
        const diff = Math.round((d2 - d1) / (1000 * 3600 * 24)) + 1;
        setJumlahHari(diff > 0 ? diff : 1);
      }
    }
  }, [awalAbsensi, akhirAbsensi]);

  // Handle click outside dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pengawasDropdownRef.current && !pengawasDropdownRef.current.contains(e.target as Node)) {
        setIsPengawasDropdownOpen(false);
      }
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(e.target as Node)) {
        setIsEmployeeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered supervisors based on query
  const filteredSupervisors = useMemo(() => {
    const q = pengawasSearch.trim().toLowerCase();
    if (!q) return supervisors.slice(0, 30);
    return supervisors.filter(s => 
      s.name.toLowerCase().includes(q) ||
      s.nik.toLowerCase().includes(q) ||
      s.jabatan.toLowerCase().includes(q) ||
      s.section.toLowerCase().includes(q)
    );
  }, [supervisors, pengawasSearch]);

  // Filtered employees for switch/quick select
  const filteredEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return employees.slice(0, 20);
    return employees.filter(e => 
      e.name.toLowerCase().includes(q) || 
      e.nik.toLowerCase().includes(q) ||
      (e.jabatan && e.jabatan.toLowerCase().includes(q))
    ).slice(0, 30);
  }, [employees, employeeSearch]);

  const handleSelectSupervisor = (spv: Supervisor) => {
    setSelectedPengawas(spv);
    setPengawasSearch(`Pak ${spv.name}`);
    setIsPengawasDropdownOpen(false);
  };

  const handleSelectEmployee = (emp: EmployeeMaster) => {
    setNik(emp.nik);
    setName(emp.name);
    if (emp.jabatan) setJabatan(emp.jabatan);
    if (emp.section) {
      const sec = emp.section.toLowerCase();
      if (sec.includes('prep')) setSection('Preparasi');
      else if (sec.includes('lab')) setSection('Laboratorium');
      else if (sec.includes('admin')) setSection('Administration');
      else if (sec.includes('maint')) setSection('Maintenance');
      else if (sec.includes('inv')) setSection('Inventory Control');
      else if (sec.includes('qa')) setSection('Quality Assurance');
    }
    if (emp.shift) {
      const sh = emp.shift.toUpperCase();
      if (sh.includes('A')) setShift('Shift A');
      else if (sh.includes('B')) setShift('Shift B');
      else setShift('Nonshift');
    }
    setIsEmployeeDropdownOpen(false);
    toast.success(`Data personil diganti ke: ${emp.name}`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 8MB.');
      return;
    }

    setIsUploading(true);
    setLampiranFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setLampiranBase64(reader.result as string);
      setIsUploading(false);
      toast.success(`File ${file.name} berhasil dilampirkan.`);
    };
    reader.onerror = () => {
      setIsUploading(false);
      toast.error('Gagal membaca file lampiran.');
    };
    reader.readAsDataURL(file);
  };

  const handleResetForm = () => {
    setAwalAbsensi(new Date().toISOString().slice(0, 10));
    setAkhirAbsensi(new Date().toISOString().slice(0, 10));
    setJumlahHari(1);
    setAlasanPreset(ALASAN_PRESETS[0]);
    setAlasanCustom('');
    setIsAlasanOther(false);
    setSelectedPengawas(null);
    setPengawasSearch('');
    setLampiranBase64(null);
    setLampiranFileName('');
    toast.info('Formulir telah dikosongkan.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nik.trim() || !name.trim()) {
      toast.error('NIK dan Nama Karyawan wajib terisi.');
      setActiveCardId('nik-name');
      return;
    }

    if (!awalAbsensi || !akhirAbsensi) {
      toast.error('Tanggal mulai dan selesai izin wajib diisi.');
      setActiveCardId('dates');
      return;
    }

    const finalAlasan = isAlasanOther ? alasanCustom.trim() : alasanPreset;
    if (!finalAlasan) {
      toast.error('Alasan izin karyawan wajib diisi.');
      setActiveCardId('alasan');
      return;
    }

    const finalPengawas = selectedPengawas 
      ? `Pak ${selectedPengawas.name}` 
      : (pengawasSearch.trim() || '-');

    if (!pengawasSearch.trim() && !selectedPengawas) {
      toast.error('Harap pilih atau tulis nama Pengawas (Gol II-V) yang mengetahui izin Anda.');
      setActiveCardId('pengawas');
      return;
    }

    setIsSubmitting(true);

    try {
      const finalTempatTinggal = tempatTinggal === 'Lainnya'
        ? (tempatTinggalCustom.trim() ? `Lainnya: ${tempatTinggalCustom.trim()}` : 'Lainnya')
        : tempatTinggal;

      const payload = {
        nik: nik.trim().toUpperCase(),
        name: name.trim(),
        jabatan: jabatan.trim(),
        section,
        penempatan: section,
        shift,
        jamShift,
        tempatTinggal: finalTempatTinggal,
        awalAbsensi,
        akhirAbsensi,
        jumlah: jumlahHari,
        lamanyaIzin: `${jumlahHari} Hari`,
        alasanAbsensi: finalAlasan,
        pengawasMengetahui: finalPengawas,
        lampiran: lampiranBase64 || null,
        acc: 'Pending'
      };

      const res = await fetch('/api/employee-leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();

      if (res.ok && json.status === 'success') {
        toast.success('Formulir Pelaporan Izin berhasil dikirim!');
        setLastSubmittedData(json.data || payload);
        setIsSubmittedSuccess(true);
      } else {
        toast.error(json.message || 'Gagal mengirim formulir pelaporan izin.');
      }
    } catch (err: any) {
      console.error('Error submitting form:', err);
      toast.error('Terjadi kesalahan jaringan saat mengirim data izin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // GOOGLE FORM CONFIRMATION SUCCESS VIEW
  // ==========================================
  if (isSubmittedSuccess) {
    return (
      <div className={`min-h-screen py-8 px-4 sm:px-6 bg-[#f0ebf8] dark:bg-slate-950 flex flex-col items-center justify-center font-sans ${isEmbedded ? 'min-h-0 py-4' : ''}`}>
        <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-[#dadce0] dark:border-slate-800 overflow-hidden">
          {/* Top Google Forms Header Accent Strip */}
          <div className="h-3 w-full bg-[#673ab7]" />

          <div className="p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display">
                  Formulir Pelaporan Izin Karyawan
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Portal Preparasi & Laboratorium
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/70 dark:border-purple-800/50 space-y-2">
              <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
                Tanggapan Anda telah direkam.
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Permohonan izin Anda telah berhasil dicatat ke dalam database portal dan otomatis disinkronkan dengan rekapan perizinan divisi.
              </p>
            </div>

            {lastSubmittedData && (
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1.5 font-bold text-slate-700 dark:text-slate-200">
                  <span>Ringkasan Tanggapan:</span>
                  <span className="text-[#673ab7] dark:text-purple-400">{lastSubmittedData.lamanyaIzin}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                  <div><span className="font-semibold">Nama:</span> {lastSubmittedData.name}</div>
                  <div><span className="font-semibold">NIK:</span> {lastSubmittedData.nik}</div>
                  <div><span className="font-semibold">Tanggal:</span> {lastSubmittedData.awalAbsensi} s/d {lastSubmittedData.akhirAbsensi}</div>
                  <div><span className="font-semibold">Shift:</span> {lastSubmittedData.shift} ({lastSubmittedData.jamShift})</div>
                  <div className="col-span-2"><span className="font-semibold">Alasan:</span> {lastSubmittedData.alasanAbsensi}</div>
                  <div className="col-span-2"><span className="font-semibold">Pengawas Mengetahui:</span> {lastSubmittedData.pengawasMengetahui}</div>
                </div>
              </div>
            )}

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsSubmittedSuccess(false);
                  handleResetForm();
                }}
                className="text-xs text-[#673ab7] dark:text-purple-400 hover:underline font-bold py-2 px-1"
              >
                Kirim tanggapan lain
              </button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                {onNav && (
                  <button
                    type="button"
                    onClick={() => onNav('employee-leaves')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#673ab7] hover:bg-[#5e35b1] text-white font-bold text-xs shadow-xs transition-all"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Lihat Rekapan Izin</span>
                  </button>
                )}
                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                  >
                    Kembali ke Home
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // GOOGLE FORM MAIN SCREEN
  // ==========================================
  return (
    <div className={`min-h-screen py-6 px-3 sm:px-6 bg-[#f0ebf8] dark:bg-slate-950 font-sans transition-colors ${isEmbedded ? 'min-h-0 py-2 px-0 bg-transparent' : ''}`}>
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Top Navigation Bar (if standalone) */}
        {!isEmbedded && (
          <div className="flex items-center justify-between py-2">
            <button
              type="button"
              onClick={onBack || (() => window.history.back())}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#673ab7] transition-colors bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl shadow-2xs border border-slate-200 dark:border-slate-800"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </button>

            {onNav && (
              <button
                type="button"
                onClick={() => onNav('employee-leaves')}
                className="inline-flex items-center gap-2 text-xs font-bold text-[#673ab7] dark:text-purple-400 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl shadow-2xs border border-purple-200 dark:border-purple-900/50 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Buka Rekapan Izin</span>
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* CARD 1: FORM HEADER CARD (GOOGLE FORMS PURPLE HERO CARD) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-[#dadce0] dark:border-slate-800 overflow-hidden relative">
            {/* Top Purple Accent Strip */}
            <div className="h-3 w-full bg-[#673ab7]" />

            <div className="p-6 sm:p-7 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-display tracking-tight">
                    Formulir Pelaporan Izin Karyawan
                  </h1>
                  <p className="text-xs sm:text-sm font-semibold text-[#673ab7] dark:text-purple-400 mt-1 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>Divisi Preparation & Laboratory - PT Trimegah Bangun Persada</span>
                  </p>
                </div>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <p>
                  Formulir resmi pelaporan izin ketidakhadiran kerja karyawan operasional, non-shift, dan staff. 
                  Pastikan formulir diisi dengan benar dan <strong>telah diketahui serta disetujui oleh Pengawas Shift (Foreman / Supervisor / Superintendent)</strong> yang bertugas.
                </p>
              </div>

              <div className="pt-2 text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <span>* Menunjukkan pertanyaan yang wajib diisi</span>
              </div>
            </div>
          </div>

          {/* CARD 2: AKUN PELAPOR STRIP (GOOGLE FORM ACCOUNT BADGE) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-[#dadce0] dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/60 text-[#673ab7] dark:text-purple-300 flex items-center justify-center font-bold text-sm shrink-0">
                {userProfile?.avatar ? (
                  <img src={userProfile.avatar} alt={name} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span>{name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 dark:text-white truncate">{name}</span>
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono font-semibold shrink-0">
                    {nik}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {jabatan} &bull; {section}
                </p>
              </div>
            </div>

            {/* Quick Switch Dropdown if needed */}
            <div className="relative" ref={employeeDropdownRef}>
              <button
                type="button"
                onClick={() => setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
                className="text-[11px] text-[#673ab7] dark:text-purple-400 font-bold hover:underline shrink-0"
              >
                Ganti Akun / Cari NIK
              </button>

              {isEmployeeDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-50">
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari NIK atau Nama personil..."
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-[#673ab7]"
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-1">
                    {filteredEmployees.map(emp => (
                      <div
                        key={emp.nik}
                        onClick={() => handleSelectEmployee(emp)}
                        className="p-2 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer transition-colors flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate">{emp.name}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{emp.nik} &bull; {emp.jabatan || '-'}</p>
                        </div>
                        {emp.nik === nik && <Check className="w-4 h-4 text-[#673ab7] shrink-0" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* QUESTION 1 & 2: NIK & NAMA KARYAWAN */}
          <div 
            onClick={() => setActiveCardId('nik-name')}
            className={`bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border transition-all ${
              activeCardId === 'nik-name' 
                ? 'border-l-4 border-l-[#673ab7] border-y-[#dadce0] border-r-[#dadce0] dark:border-y-slate-800 dark:border-r-slate-800' 
                : 'border-[#dadce0] dark:border-slate-800'
            }`}
          >
            <label className="block text-sm font-bold text-slate-900 dark:text-white mb-1">
              Data Karyawan yang Mengajukan Izin <span className="text-rose-500">*</span>
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
              Identitas NIK dan Nama lengkap karyawan yang berhalangan hadir.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">NIK ID Card Karyawan</span>
                <input
                  type="text"
                  required
                  value={nik}
                  onChange={(e) => setNik(e.target.value.toUpperCase())}
                  placeholder="Contoh: M0407240479"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-[#673ab7] font-mono font-bold"
                />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Nama Lengkap Karyawan</span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama sesuai KTP / ID Card"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-[#673ab7] font-bold"
                />
              </div>
            </div>
          </div>

          {/* QUESTION 3 & 4: JABATAN & PENEMPATAN PEKERJAAN */}
          <div 
            onClick={() => setActiveCardId('section')}
            className={`bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border transition-all ${
              activeCardId === 'section' 
                ? 'border-l-4 border-l-[#673ab7] border-y-[#dadce0] border-r-[#dadce0] dark:border-y-slate-800 dark:border-r-slate-800' 
                : 'border-[#dadce0] dark:border-slate-800'
            }`}
          >
            <label className="block text-sm font-bold text-slate-900 dark:text-white mb-1">
              Jabatan & Penempatan Pekerjaan (Section) <span className="text-rose-500">*</span>
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
              Pilih bagian atau divisi tempat Anda bertugas di Preparation & Laboratory.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Jabatan</span>
                <input
                  type="text"
                  required
                  value={jabatan}
                  onChange={(e) => setJabatan(e.target.value)}
                  placeholder="Contoh: Crew, Preparation & Laboratory"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-[#673ab7] font-medium"
                />
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Penempatan Pekerjaan</span>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-[#673ab7] font-bold"
                >
                  {SECTION_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* QUESTION: TEMPAT TINGGAL KARYAWAN */}
          <div 
            onClick={() => setActiveCardId('tempat-tinggal')}
            className={`bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border transition-all ${
              activeCardId === 'tempat-tinggal' 
                ? 'border-l-4 border-l-[#673ab7] border-y-[#dadce0] border-r-[#dadce0] dark:border-y-slate-800 dark:border-r-slate-800' 
                : 'border-[#dadce0] dark:border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-bold text-slate-900 dark:text-white">
                Tempat Tinggal Karyawan <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] font-bold text-[#673ab7] bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                Wajib Diisi
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
              Pilih lokasi tempat tinggal / akomodasi Anda selama bertugas di Site.
            </p>

            <div className="space-y-2">
              {[
                { id: 'nirwana', label: 'Nirwana (Mess)' },
                { id: 'ecovillage', label: 'Kampung Kawasi (Ecovillage)' },
                { id: 'kawasi_lama', label: 'Kampung Kawasi (Lama)' },
                { id: 'lainnya', label: 'Lainnya' }
              ].map(opt => (
                <label 
                  key={opt.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                    tempatTinggal === opt.label 
                      ? 'bg-purple-50 dark:bg-purple-950/50 border-[#673ab7] text-[#673ab7] dark:text-purple-300 shadow-2xs font-bold' 
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="tempatTinggal" 
                    value={opt.label} 
                    checked={tempatTinggal === opt.label} 
                    onChange={() => setTempatTinggal(opt.label)} 
                    className="text-[#673ab7] focus:ring-[#673ab7]"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}

              {tempatTinggal === 'Lainnya' && (
                <div className="pt-2 pl-2">
                  <input
                    type="text"
                    value={tempatTinggalCustom}
                    onChange={(e) => setTempatTinggalCustom(e.target.value)}
                    placeholder="Tuliskan tempat tinggal Anda..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-[#673ab7] font-medium"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>

          {/* QUESTION 5 & 6: SHIFT & JAM MASUK BEKERJA */}
          <div 
            onClick={() => setActiveCardId('shift')}
            className={`bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border transition-all ${
              activeCardId === 'shift' 
                ? 'border-l-4 border-l-[#673ab7] border-y-[#dadce0] border-r-[#dadce0] dark:border-y-slate-800 dark:border-r-slate-800' 
                : 'border-[#dadce0] dark:border-slate-800'
            }`}
          >
            <label className="block text-sm font-bold text-slate-900 dark:text-white mb-1">
              Shift Karyawan & Jam Kerja <span className="text-rose-500">*</span>
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
              Pilih shift dan jadwal jam kerja saat berhalangan hadir.
            </p>

            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-2">Shift Kerja:</span>
                <div className="grid grid-cols-3 gap-2">
                  {SHIFT_OPTIONS.map(sh => (
                    <label 
                      key={sh}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                        shift === sh 
                          ? 'bg-purple-50 dark:bg-purple-950/50 border-[#673ab7] text-[#673ab7] dark:text-purple-300 shadow-2xs' 
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="shift" 
                        value={sh} 
                        checked={shift === sh} 
                        onChange={() => setShift(sh)} 
                        className="text-[#673ab7] focus:ring-[#673ab7]"
                      />
                      <span>{sh}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-2">Jam / Shift Masuk Bekerja:</span>
                <div className="grid grid-cols-3 gap-2">
                  {JAM_SHIFT_OPTIONS.map(jm => (
                    <label 
                      key={jm}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                        jamShift === jm 
                          ? 'bg-purple-50 dark:bg-purple-950/50 border-[#673ab7] text-[#673ab7] dark:text-purple-300 shadow-2xs' 
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="jamShift" 
                        value={jm} 
                        checked={jamShift === jm} 
                        onChange={() => setJamShift(jm)} 
                        className="text-[#673ab7] focus:ring-[#673ab7]"
                      />
                      <span>{jm}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* QUESTION 7: TANGGAL IZIN KARYAWAN & DURASI */}
          <div 
            onClick={() => setActiveCardId('dates')}
            className={`bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border transition-all ${
              activeCardId === 'dates' 
                ? 'border-l-4 border-l-[#673ab7] border-y-[#dadce0] border-r-[#dadce0] dark:border-y-slate-800 dark:border-r-slate-800' 
                : 'border-[#dadce0] dark:border-slate-800'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <label className="block text-sm font-bold text-slate-900 dark:text-white">
                Tanggal Izin Karyawan & Lamanya Izin <span className="text-rose-500">*</span>
              </label>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-[#673ab7] dark:text-purple-300 font-bold text-xs shrink-0 border border-purple-200 dark:border-purple-800">
                {jumlahHari} Hari Izin
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
              Tentukan tanggal mulai dan selesai izin absensi Anda.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Tanggal Mulai Izin</span>
                <input
                  type="date"
                  required
                  value={awalAbsensi}
                  onChange={(e) => {
                    setAwalAbsensi(e.target.value);
                    if (e.target.value > akhirAbsensi) setAkhirAbsensi(e.target.value);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-[#673ab7] font-semibold"
                />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Tanggal Selesai Izin</span>
                <input
                  type="date"
                  required
                  value={akhirAbsensi}
                  min={awalAbsensi}
                  onChange={(e) => setAkhirAbsensi(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-[#673ab7] font-semibold"
                />
              </div>
            </div>
          </div>

          {/* QUESTION 8: ALASAN IZIN KARYAWAN (RADIO OPTIONS ALA GOOGLE FORM) */}
          <div 
            onClick={() => setActiveCardId('alasan')}
            className={`bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border transition-all ${
              activeCardId === 'alasan' 
                ? 'border-l-4 border-l-[#673ab7] border-y-[#dadce0] border-r-[#dadce0] dark:border-y-slate-800 dark:border-r-slate-800' 
                : 'border-[#dadce0] dark:border-slate-800'
            }`}
          >
            <label className="block text-sm font-bold text-slate-900 dark:text-white mb-1">
              Alasan Izin Karyawan <span className="text-rose-500">*</span>
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
              Pilih alasan yang sesuai dengan permohonan izin Anda.
            </p>

            <div className="space-y-2.5">
              {ALASAN_PRESETS.map((als) => (
                <label 
                  key={als}
                  className="flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                >
                  <input
                    type="radio"
                    name="alasanOption"
                    checked={!isAlasanOther && alasanPreset === als}
                    onChange={() => {
                      setIsAlasanOther(false);
                      setAlasanPreset(als);
                    }}
                    className="mt-0.5 text-[#673ab7] focus:ring-[#673ab7]"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
                    {als}
                  </span>
                </label>
              ))}

              {/* Radio 'Yang lain' */}
              <div className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <label className="flex items-center gap-3 cursor-pointer mb-2">
                  <input
                    type="radio"
                    name="alasanOption"
                    checked={isAlasanOther}
                    onChange={() => setIsAlasanOther(true)}
                    className="text-[#673ab7] focus:ring-[#673ab7]"
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    Yang lain:
                  </span>
                </label>

                {isAlasanOther && (
                  <div className="pl-7">
                    <input
                      type="text"
                      required={isAlasanOther}
                      value={alasanCustom}
                      onChange={(e) => setAlasanCustom(e.target.value)}
                      placeholder="Tuliskan alasan izin secara spesifik..."
                      className="w-full border-b-2 border-b-[#673ab7] bg-transparent py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none font-medium placeholder-slate-400"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* QUESTION 9: NAMA PENGAWAS YANG MENGETAHUI IZIN KARYAWAN (POIN 3 USER - AUTOSEARCH GOL II-V) */}
          <div 
            onClick={() => setActiveCardId('pengawas')}
            className={`bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border transition-all ${
              activeCardId === 'pengawas' 
                ? 'border-l-4 border-l-[#673ab7] border-y-[#dadce0] border-r-[#dadce0] dark:border-y-slate-800 dark:border-r-slate-800' 
                : 'border-[#dadce0] dark:border-slate-800'
            }`}
          >
            <label className="block text-sm font-bold text-slate-900 dark:text-white mb-1">
              Nama dari Pengawas yang Mengetahui Izin Karyawan <span className="text-rose-500">*</span>
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
              Ketik nama pengawas (Foreman / Supervisor / Superintendent - Golongan II s/d V) dari database karyawan untuk mencari otomatis.
            </p>

            <div className="relative" ref={pengawasDropdownRef}>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={pengawasSearch}
                  onFocus={() => setIsPengawasDropdownOpen(true)}
                  onChange={(e) => {
                    setPengawasSearch(e.target.value);
                    setIsPengawasDropdownOpen(true);
                    if (selectedPengawas && !e.target.value.includes(selectedPengawas.name)) {
                      setSelectedPengawas(null);
                    }
                  }}
                  placeholder="Ketik nama pengawas... (misal: Abdul Azis, Nyong, Deni, Arthur, Arif...)"
                  className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-[#673ab7] font-semibold"
                />

                {selectedPengawas && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPengawas(null);
                      setPengawasSearch('');
                    }}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Selected Badge */}
              {selectedPengawas && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldCheck className="w-4 h-4 text-[#673ab7] shrink-0" />
                    <div className="truncate">
                      <span className="font-bold text-slate-900 dark:text-white mr-1.5">
                        Pak {selectedPengawas.name}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        ({selectedPengawas.jabatan})
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-[#673ab7] text-white font-bold text-[10px] shrink-0">
                    Gol {selectedPengawas.gol}
                  </span>
                </div>
              )}

              {/* Autosearch Suggestions Popup */}
              {isPengawasDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-50 max-h-60 overflow-y-auto">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/60 mb-1 flex items-center justify-between">
                    <span>Daftar Pengawas (Gol II - V)</span>
                    <span>{filteredSupervisors.length} Ditemukan</span>
                  </div>

                  {filteredSupervisors.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-500">
                      Tidak ditemukan pengawas dengan kata kunci "{pengawasSearch}". Anda tetap dapat menuliskan nama secara manual.
                    </div>
                  ) : (
                    filteredSupervisors.map(spv => (
                      <div
                        key={spv.nik}
                        onClick={() => handleSelectSupervisor(spv)}
                        className="p-2 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer transition-colors flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            Pak {spv.name}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {spv.jabatan} &bull; {spv.section}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-[#673ab7] dark:text-purple-300 font-bold text-[9.5px]">
                            Gol {spv.gol}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* QUESTION 10: FOTO LAMPIRAN BUKTI IZIN */}
          <div 
            onClick={() => setActiveCardId('lampiran')}
            className={`bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border transition-all ${
              activeCardId === 'lampiran' 
                ? 'border-l-4 border-l-[#673ab7] border-y-[#dadce0] border-r-[#dadce0] dark:border-y-slate-800 dark:border-r-slate-800' 
                : 'border-[#dadce0] dark:border-slate-800'
            }`}
          >
            <label className="block text-sm font-bold text-slate-900 dark:text-white mb-1">
              Foto Lampiran Izin (Bukti Laporan ke Pengawas / Polindes / Surat Dokter)
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
              Unggah foto screenshot chat izin dengan pengawas, hasil pemeriksaan polindes/klinik, atau surat keterangan dokter (opsional tapi disarankan).
            </p>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*,application/pdf"
              className="hidden"
            />

            {lampiranBase64 ? (
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <ImageIcon className="w-5 h-5 text-[#673ab7] shrink-0" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {lampiranFileName || 'File Dokumen Terlampir'}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] text-[#673ab7] dark:text-purple-400 font-bold hover:underline"
                  >
                    Ganti
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLampiranBase64(null);
                      setLampiranFileName('');
                    }}
                    className="text-[11px] text-rose-500 font-bold hover:underline"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#673ab7] rounded-xl p-5 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/40"
              >
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/60 text-[#673ab7] dark:text-purple-300 mx-auto flex items-center justify-center mb-2">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {isUploading ? 'Sedang mengunggah...' : 'Klik untuk Unggah Lampiran'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Mendukung file Gambar (JPG, PNG) atau PDF (Maks. 8MB)
                </p>
              </div>
            )}
          </div>

          {/* ACTION BUTTONS (GOOGLE FORMS PURPLE SUBMIT BAR) */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-lg bg-[#673ab7] hover:bg-[#5e35b1] text-white font-bold text-sm shadow-xs transition-all flex items-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Mengirim Tanggapan...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Kirim</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResetForm}
              className="text-xs text-[#673ab7] dark:text-purple-400 hover:underline font-bold py-2 px-2"
            >
              Kosongkan formulir
            </button>
          </div>

        </form>

        <p className="text-center text-[11px] text-slate-400 py-4">
          Formulir ini dibuat di dalam PrepLab Portal terintegrasi dengan Google Workspace PrepLab Cloud.
        </p>

      </div>
    </div>
  );
}
