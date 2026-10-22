import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  FileText, 
  Send, 
  RotateCcw, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  User, 
  Upload, 
  Image as ImageIcon, 
  Search, 
  ExternalLink, 
  ArrowLeft, 
  Info, 
  Sparkles, 
  AlertCircle, 
  Check, 
  X,
  FileSpreadsheet,
  Building2,
  Layers,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

interface EmployeeMaster {
  nik: string;
  name: string;
  jabatan?: string;
  section?: string;
  shift?: string;
  gol?: string;
  avatar?: string;
}

interface EmployeeTardinessFormScreenProps {
  inspectorName?: string;
  inspectorNik?: string;
  userProfile?: any;
  onNav?: (tab: string) => void;
  onBack?: () => void;
  isEmbedded?: boolean;
}

const SECTION_OPTIONS = [
  'Preparation',
  'Laboratory',
  'Maintenance',
  'Administration'
];

const SHIFT_OPTIONS = ['Shift A', 'Shift B', 'Nonshift'];

const ALASAN_PRESETS = [
  'Terlambat Minhol',
  'Ketinggalan Minhol',
  'Telat Bangun Pagi',
  'Kendala Transportasi / Jalan Rusak',
  'Ban Bocor / Kendala Kendaraan',
  'Keperluan Keluarga Mendesak',
  'Kondisi Fisik Kurang Sehat / Sakit Ringan',
  'Hujan Deras / Cuaca Buruk',
  'Pengurusan Dokumen / Berkas Mendesak'
];

export function EmployeeTardinessFormScreen({
  inspectorName = '',
  inspectorNik = '',
  userProfile,
  onNav,
  onBack,
  isEmbedded = false
}: EmployeeTardinessFormScreenProps) {
  // Master Data
  const [employees, setEmployees] = useState<EmployeeMaster[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Form Fields
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeMaster | null>(null);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const employeeDropdownRef = useRef<HTMLDivElement>(null);

  const [shift, setShift] = useState('Shift A');
  const [section, setSection] = useState('Preparation');

  // Tanggal default hari ini WIT (UTC+9)
  const getTodayDate = () => {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jayapura' }).format(new Date());
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  };

  const getCurrentTime = () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  };

  const [tanggal, setTanggal] = useState(getTodayDate());
  const [waktuFinger, setWaktuFinger] = useState(getCurrentTime());
  const [statusFinger, setStatusFinger] = useState<'Masuk' | 'Pulang'>('Masuk');

  // Foto Lampiran / Bukti Finger
  const [fotoFingerBase64, setFotoFingerBase64] = useState<string | null>(null);
  const [fotoFileName, setFotoFileName] = useState('');
  const [isUploadingFoto, setIsUploadingFoto] = useState(false);

  // Alasan
  const [alasan, setAlasan] = useState('');

  // Submit status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);

  // Load employee master
  useEffect(() => {
    async function fetchEmployees() {
      try {
        setLoadingEmployees(true);
        const res = await fetch('/api/employees');
        const json = await res.json();
        if (Array.isArray(json)) {
          setEmployees(json);
        }
      } catch (err) {
        console.error('Failed to load employees master:', err);
      } finally {
        setLoadingEmployees(false);
      }
    }
    fetchEmployees();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target as Node)) {
        setIsEmployeeDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered employee options
  const filteredEmployees = useMemo(() => {
    if (!employeeSearchQuery.trim()) return employees.slice(0, 30);
    const q = employeeSearchQuery.toLowerCase().trim();
    return employees.filter(e => 
      e.name.toLowerCase().includes(q) || 
      e.nik.toLowerCase().includes(q) ||
      (e.section && e.section.toLowerCase().includes(q))
    ).slice(0, 30);
  }, [employees, employeeSearchQuery]);

  // Handle select employee
  const handleSelectEmployee = (emp: EmployeeMaster) => {
    setSelectedEmployee(emp);
    setEmployeeSearchQuery(emp.name);
    setIsEmployeeDropdownOpen(false);

    // Auto-fill Section if available
    if (emp.section) {
      const secStr = emp.section.toLowerCase();
      if (secStr.includes('lab')) setSection('Laboratory');
      else if (secStr.includes('prep')) setSection('Preparation');
      else if (secStr.includes('maint')) setSection('Maintenance');
      else if (secStr.includes('admin')) setSection('Administration');
      else setSection(emp.section);
    }

    // Auto-fill Shift if available
    if (emp.shift) {
      const shStr = emp.shift.toUpperCase();
      if (shStr.includes('A')) setShift('Shift A');
      else if (shStr.includes('B')) setShift('Shift B');
      else if (shStr.includes('NON')) setShift('Nonshift');
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Ukuran file maksimal adalah 8MB.');
      return;
    }

    setIsUploadingFoto(true);
    setFotoFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setFotoFingerBase64(reader.result as string);
      setIsUploadingFoto(false);
      toast.success('Foto bukti finger berhasil diunggah.');
    };
    reader.onerror = () => {
      setIsUploadingFoto(false);
      toast.error('Gagal membaca file foto.');
    };
    reader.readAsDataURL(file);
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const employeeName = selectedEmployee?.name || employeeSearchQuery.trim();
    if (!employeeName) {
      toast.error('Nama Karyawan wajib diisi.');
      return;
    }

    if (!tanggal) {
      toast.error('Tanggal wajib dipilih.');
      return;
    }

    if (!waktuFinger) {
      toast.error('Waktu Finger wajib diisi.');
      return;
    }

    if (!alasan.trim()) {
      toast.error('Alasan keterlambatan / pulang cepat wajib diisi.');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        nik: selectedEmployee?.nik || null,
        name: employeeName,
        jabatan: selectedEmployee?.jabatan || null,
        section,
        shift,
        tanggal,
        waktuFinger,
        statusFinger,
        fotoFinger: fotoFingerBase64 || null,
        alasan: alasan.trim()
      };

      const res = await fetch('/api/employee-tardiness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (json.status === 'success') {
        toast.success('Laporan keterlambatan / pulang cepat berhasil dikirim!');
        setSubmittedData(json.data);
        setSubmitSuccess(true);
      } else {
        toast.error(json.message || 'Gagal mengirim laporan.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setSelectedEmployee(null);
    setEmployeeSearchQuery('');
    setShift('Shift A');
    setSection('Preparation');
    setTanggal(getTodayDate());
    setWaktuFinger(getCurrentTime());
    setStatusFinger('Masuk');
    setFotoFingerBase64(null);
    setFotoFileName('');
    setAlasan('');
    setSubmitSuccess(false);
    setSubmittedData(null);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 p-3 sm:p-6 lg:p-8 flex justify-center">
      <div className="max-w-2xl w-full space-y-5">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNav ? onNav('keterlambatan') : (onBack ? onBack() : null)}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Rekapan</span>
          </button>

          <button
            type="button"
            onClick={() => onNav ? onNav('keterlambatan') : null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Lihat Rekapan Tabel</span>
          </button>
        </div>

        {submitSuccess ? (
          /* Success Card */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-lg space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200 dark:border-emerald-800 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Laporan Berhasil Terkirim!
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Data keterlambatan / pulang cepat telah berhasil dicatat ke sistem dan tersinkronisasi ke portal Prep&amp;Lab.
              </p>
            </div>

            {submittedData && (
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-left text-xs space-y-2 max-w-md mx-auto">
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">Karyawan:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{submittedData.name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">Tanggal:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{submittedData.tanggal}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                  <span className="text-slate-500">Kategori:</span>
                  <span className={`font-bold ${submittedData.statusFinger === 'Pulang' ? 'text-indigo-600' : 'text-amber-600'}`}>
                    {submittedData.statusFinger === 'Pulang' ? 'Pulang Cepat' : 'Terlambat Masuk'} ({submittedData.waktuFinger})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Alasan:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 text-right">{submittedData.alasan}</span>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
              >
                Isi Formulir Baru
              </button>
              <button
                type="button"
                onClick={() => onNav ? onNav('keterlambatan') : null}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all cursor-pointer"
              >
                Lihat di Rekapan Tabel
              </button>
            </div>
          </div>
        ) : (
          /* Form Card Styled Like Google Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Form Top Banner Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="h-3 bg-gradient-to-r from-rose-500 via-rose-600 to-indigo-600" />
              <div className="p-5 sm:p-7 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                    Formulir Resmi
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-500">Departemen Preparation &amp; Laboratory</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Form Keterlambatan &amp; Pulang Cepat
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Silakan isi formulir ini untuk pelaporan keterlambatan finger masuk atau izin pulang mendahului jadwal shift kerja.
                </p>
                <div className="pt-2 text-[11px] text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                  <span>* Menandakan kolom wajib diisi</span>
                </div>
              </div>
            </div>

            {/* Field 1: Nama Karyawan */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-2">
              <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block">
                Nama Karyawan <span className="text-rose-500">*</span>
              </label>
              <p className="text-[11px] text-slate-400">
                Pilih atau cari nama dari database karyawan Prep&amp;Lab
              </p>

              <div ref={employeeDropdownRef} className="relative mt-2">
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={loadingEmployees ? 'Memuat database karyawan...' : 'Ketik nama karyawan atau NIK...'}
                    value={employeeSearchQuery}
                    onChange={e => {
                      setEmployeeSearchQuery(e.target.value);
                      setIsEmployeeDropdownOpen(true);
                      if (!e.target.value) setSelectedEmployee(null);
                    }}
                    onFocus={() => setIsEmployeeDropdownOpen(true)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    required
                  />
                  {selectedEmployee && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      ✓ Terpilih
                    </span>
                  )}
                </div>

                {isEmployeeDropdownOpen && filteredEmployees.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 mt-1.5 max-h-56 overflow-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl divide-y divide-slate-100 dark:divide-slate-700/60">
                    {filteredEmployees.map(emp => (
                      <button
                        key={emp.nik || emp.name}
                        type="button"
                        onClick={() => handleSelectEmployee(emp)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-rose-50 dark:hover:bg-slate-700/80 transition-colors flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100">
                            {emp.name}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            NIK: {emp.nik} · {emp.section || 'Prep&Lab'}
                          </div>
                        </div>
                        {emp.shift && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {emp.shift}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Field 2 & 3: Section & Shift */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Section */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-2">
                <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block">
                  Section <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-1.5 mt-2">
                  {SECTION_OPTIONS.map(opt => (
                    <label 
                      key={opt}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        section === opt
                          ? 'bg-rose-50/70 border-rose-300 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="section"
                        value={opt}
                        checked={section === opt}
                        onChange={() => setSection(opt)}
                        className="accent-rose-600"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Shift */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-2">
                <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block">
                  Shift Karyawan <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-1.5 mt-2">
                  {SHIFT_OPTIONS.map(opt => (
                    <label 
                      key={opt}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        shift === opt
                          ? 'bg-rose-50/70 border-rose-300 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="shift"
                        value={opt}
                        checked={shift === opt}
                        onChange={() => setShift(opt)}
                        className="accent-rose-600"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Field 4: Status Finger (Kategori) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-2">
              <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block">
                Status Finger (Kategori) <span className="text-rose-500">*</span>
              </label>
              <p className="text-[11px] text-slate-400">
                Pilih apakah pelaporan untuk keterlambatan datang (Masuk) atau kepulangan lebih awal (Pulang)
              </p>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => setStatusFinger('Masuk')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    statusFinger === 'Masuk'
                      ? 'bg-amber-50 border-amber-400 text-amber-900 dark:bg-amber-950/50 dark:border-amber-700 dark:text-amber-200 ring-2 ring-amber-500/20'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs sm:text-sm">Finger Masuk</span>
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${statusFinger === 'Masuk' ? 'border-amber-600 bg-amber-600' : 'border-slate-300'}`}>
                      {statusFinger === 'Masuk' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </span>
                  </div>
                  <div className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-1 font-medium">
                    Keterlambatan masuk kerja
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFinger('Pulang')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    statusFinger === 'Pulang'
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-900 dark:bg-indigo-950/50 dark:border-indigo-700 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs sm:text-sm">Finger Pulang</span>
                    <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${statusFinger === 'Pulang' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                      {statusFinger === 'Pulang' && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </span>
                  </div>
                  <div className="text-[11px] text-indigo-700/80 dark:text-indigo-400/80 mt-1 font-medium">
                    Pulang lebih awal / cepat
                  </div>
                </button>
              </div>
            </div>

            {/* Field 5 & 6: Tanggal & Waktu Finger */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tanggal */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-2">
                <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block">
                  Tanggal Kejadian <span className="text-rose-500">*</span>
                </label>
                <div className="relative mt-2">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="date"
                    value={tanggal}
                    onChange={e => setTanggal(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    required
                  />
                </div>
              </div>

              {/* Waktu Finger */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-2">
                <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block">
                  Waktu Finger Karyawan <span className="text-rose-500">*</span>
                </label>
                <div className="relative mt-2">
                  <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="time"
                    value={waktuFinger}
                    onChange={e => setWaktuFinger(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Field 7: Foto Bukti Finger */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-2">
              <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block">
                Foto Finger Karyawan (Opsional / Bukti)
              </label>
              <p className="text-[11px] text-slate-400">
                Unggah foto bukti mesin fingerprint atau bukti pendukung (maks. 8MB)
              </p>

              {fotoFingerBase64 ? (
                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={fotoFingerBase64} 
                      alt="Preview" 
                      className="w-12 h-12 object-cover rounded-lg border border-slate-200" 
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px] sm:max-w-[300px]">
                        {fotoFileName || 'Foto Bukti Finger'}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-semibold">
                        ✓ Siap dikirim
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFotoFingerBase64(null);
                      setFotoFileName('');
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                    title="Hapus foto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="mt-3 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-rose-400 dark:hover:border-rose-600 rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/30">
                  <Upload className="w-6 h-6 text-slate-400" />
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 text-center">
                    {isUploadingFoto ? 'Sedang memproses foto...' : 'Klik untuk memilih atau mengambil foto bukti'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    PNG, JPG, JPEG hingga 8MB
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Field 8: Alasan Keterlambatan / Pulang Cepat */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-2">
              <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 block">
                Alasan Keterlambatan / Pulang Cepat <span className="text-rose-500">*</span>
              </label>
              <p className="text-[11px] text-slate-400">
                Pilih salah satu template cepat di bawah atau tuliskan alasan lengkap Anda
              </p>

              {/* Preset Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {ALASAN_PRESETS.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAlasan(preset)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                placeholder="Tuliskan keterangan / alasan lengkap keterlambatan atau pulang cepat..."
                value={alasan}
                onChange={e => setAlasan(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 mt-2"
                required
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Kosongkan Formulir
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Mengirim Laporan...' : 'Kirim Laporan'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
