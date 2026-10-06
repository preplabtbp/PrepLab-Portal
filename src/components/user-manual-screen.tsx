import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronDown, BookOpen, ShieldCheck, Wrench, ThermometerSun, 
  MessageSquare, FileText, ChevronLeft, Cloud, CheckSquare, 
  Settings, Layers, Home, Info, HelpCircle, UserCheck, Package, 
  Play, Sparkles, Search, Compass, CheckCircle2, ArrowRight,
  ShieldAlert, User, LayoutGrid, PlusCircle, RotateCcw, Eye,
  FlaskConical, ClipboardList, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface InteractiveTutorialItem {
  id: string;
  title: string;
  moduleName: string;
  badge: string;
  isAvailable: boolean;
  category: 'core' | 'ops' | 'maintenance' | 'safety';
  icon: React.ReactNode;
  description: string;
  stepCount: number;
  steps: {
    title: string;
    description: string;
  }[];
}

const INTERACTIVE_TUTORIALS: InteractiveTutorialItem[] = [
  {
    id: 'homepage',
    title: 'Panduan Interaktif Beranda (Homepage)',
    moduleName: 'Homepage / Beranda',
    badge: 'Tersedia Sekarang • In-App',
    isAvailable: true,
    category: 'core',
    icon: <Home className="w-5 h-5 text-teal-600 dark:text-teal-400" />,
    description: 'Pelajari navigasi terpusat header, profil & quotes harian, Action Center tugas adaptif role, Section Log Book seksi, serta kustomisasi widget dashboard.',
    stepCount: 6,
    steps: [
      {
        title: '1. Pencarian Modul Terpusat di Header',
        description: 'Cari seluruh modul, SOP, logbook, atau tiket langsung dari bagian tengah header layar (atau gunakan tombol Ctrl+K).'
      },
      {
        title: '2. Kartu Identitas & Skena Quotes',
        description: 'Informasi shift kerja, status onsite, seksi, serta quote inspirasi harian yang diperbarui setiap hari.'
      },
      {
        title: '3. Action Center: Pusat Kendali Tugas',
        description: 'Menampilkan indikator tugas pending operasional, jadwal inspeksi, materi P5M, dan modul khusus sesuai jabatan (SPV/SPT/Manager).'
      },
      {
        title: '4. Alur Kerja & Log Book Seksi',
        description: 'Daftar penugasan kegiatan harian/rutin, pembagian PIC, checklist subtask, dan sinkronisasi otomatis ke dokumen Labnote.'
      },
      {
        title: '5. Dashboard Widget Personal',
        description: 'Ruang kerja kustomisasi: jam operasional, kalender shift, cuaca site, catatan cepat, dan menu kantin dalam satu komposisi.'
      },
      {
        title: '6. Personalisasi & Tambah Widget',
        description: 'Menambah, menyembunyikan, atau mereset widget sesuai kebutuhan kenyamanan kerja Anda.'
      }
    ]
  },
  {
    id: 'logbook',
    title: 'Panduan Alur Section Log Book',
    moduleName: 'Section Log Book',
    badge: 'Segera Hadir',
    isAvailable: false,
    category: 'ops',
    icon: <ClipboardList className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
    description: 'Simulasi cara membuat kegiatan baru, menugaskan multi-PIC, mengelola checklist subtask, carry-over tugas, dan sinkronisasi ke Labnote.',
    stepCount: 5,
    steps: [
      {
        title: '1. Membuat Tugas & Memilih Seksi',
        description: 'Input judul kegiatan, klasifikasi (Daily/Weekly/Monthly), dan tanggal pengerjaan.'
      },
      {
        title: '2. Multi-PIC & Penugasan',
        description: 'Pilih satu atau beberapa personil pelaksana kegiatan dalam tim.'
      },
      {
        title: '3. Checklist Subtask Terintegrasi',
        description: 'Buat poin-poin checklist subtask yang dapat dicentang secara mandiri oleh PIC.'
      },
      {
        title: '4. Sinkronisasi 2-Arah ke Labnote',
        description: 'Hubungkan kegiatan ke baris tabel dokumen Labnote agar progres terlaporkan secara otomatis.'
      },
      {
        title: '5. Penyelesaian & Penjadwalan Periode Berikutnya',
        description: 'Konfirmasi tuntas dan otomasi penjadwalan siklus berikutnya untuk tugas rutin.'
      }
    ]
  },
  {
    id: 'labnote',
    title: 'Panduan Portal Labnote & Diskusi',
    moduleName: 'Labnote & Pengumuman',
    badge: 'Segera Hadir',
    isAvailable: false,
    category: 'ops',
    icon: <FileText className="w-5 h-5 text-sky-600 dark:text-sky-400" />,
    description: 'Panduan membaca berita rilis divisi, filter Lab TBP/GTS, berdiskusi pada kolom komentar, serta publikasi pengumuman.',
    stepCount: 4,
    steps: [
      {
        title: '1. Memilih Universe Labnote (TBP / GTS)',
        description: 'Beralih antara portal pengumuman PT Trimegah Bangun Persada dan PT Gane Tambang Sentosa.'
      },
      {
        title: '2. Focus Mode Diskusi Kerja',
        description: 'Mengaktifkan layar penuh tanpa distraksi untuk fokus membaca tabel atau materi rapat.'
      },
      {
        title: '3. Berdiskusi & Komentar Progres',
        description: 'Mengirimkan tanggapan atau lampiran dokumen pada topik buletin untuk mendapatkan EXP Vanguard.'
      },
      {
        title: '4. Riwayat Notifikasi & Changelog',
        description: 'Memantau pembaruan artikel dan komentar yang menyebut seksi Anda.'
      }
    ]
  },
  {
    id: 'inspeksi',
    title: 'Panduan Inspeksi K3 & Lapor Hazard',
    moduleName: 'Inspeksi & Observasi K3',
    badge: 'Segera Hadir',
    isAvailable: false,
    category: 'safety',
    icon: <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
    description: 'Alur inspeksi berkala, checklist P2H pra-operasi, input laporan KTA/TTA, dan tindak lanjut temuan bahaya.',
    stepCount: 4,
    steps: [
      {
        title: '1. Checklist Pra-Operasi (P2H)',
        description: 'Pemeriksaan kelayakan unit harian sebelum operasional dimulai.'
      },
      {
        title: '2. Formulir Cepat KTA & TTA',
        description: 'Mengunggah foto dan lokasi kondisi atau tindakan tidak aman untuk pencegahan insiden.'
      },
      {
        title: '3. Inspeksi Mingguan Terjadwal',
        description: 'Audit housekeeping dan fasilitas kerja dengan tanda tangan digital ganda.'
      },
      {
        title: '4. Pelacakan Tiket Resolusi Bahaya',
        description: 'Monitoring status tindakan koreksi temuan hingga dinyatakan Closed.'
      }
    ]
  },
  {
    id: 'wo',
    title: 'Panduan Siklus Work Order (WO)',
    moduleName: 'Work Order & Pemeliharaan',
    badge: 'Segera Hadir',
    isAvailable: false,
    category: 'maintenance',
    icon: <Wrench className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
    description: 'Tata cara pelaporan alat breakdown, pengerjaan teknisi, pencatatan downtime, dan pencetakan berita acara.',
    stepCount: 4,
    steps: [
      {
        title: '1. Mengajukan Tiket Kerusakan Unit',
        description: 'Pilih nomor unit/alat kerja, sertakan deskripsi gejala kerusakan dan foto bukti.'
      },
      {
        title: '2. Penugasan & Respon Teknisi',
        description: 'Teknisi workshop mengubah status menjadi In Progress untuk menghitung durasi pengerjaan.'
      },
      {
        title: '3. Penggantian Sparepart & Uji Fungsi',
        description: 'Input rincian suku cadang dan lama downtime alat operasional.'
      },
      {
        title: '4. Penutupan WO & Generate Berita Acara',
        description: 'Dokumentasi penutupan tiket dan penerbitan laporan PDF resmi.'
      }
    ]
  }
];

const SOP_DOCUMENTATION = [
  {
    id: 'roles',
    title: 'Hak Akses & Menu Khusus Jabatan',
    icon: <UserCheck className="w-5 h-5 text-purple-500" />,
    content: (
      <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        <p>Aplikasi ini memiliki sistem <strong>Role-Based Access Control</strong>. Anda hanya akan melihat menu yang relevan dengan pekerjaan Anda:</p>
        <div className="space-y-2.5">
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
            <h4 className="font-semibold text-teal-700 dark:text-teal-400 mb-0.5">🧪 Tim Laboratory</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">Akses khusus ke menu <strong>Pantau Parameter</strong> untuk mencatat suhu, kelembapan, dan flow gas harian.</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
            <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-0.5">🔧 Tim Maintenance</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">Akses eksklusif ke <strong>Daftar Work Order</strong> untuk mengubah status WO, mengisi rincian sparepart, dan lama downtime perbaikan.</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
            <h4 className="font-semibold text-purple-700 dark:text-purple-400 mb-0.5">📦 Inventory Control (APD)</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">Membuka menu <strong>Inventory Control (APD)</strong> untuk distribusi APD ke pekerja dan monitoring siklus usia APD.</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
            <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-0.5">✔️ QA (Quality Assurance) & Developer</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">Membuka akses ke manajemen Quiz K3/SOP, konseling pelanggaran, serta audit kepatuhan portal.</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-0.5">👷 Crew / Operator</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">Tampilan disederhanakan dengan menu esensial: Quiz Safety harian, Checklist P2H, dan Log Book tugas seksi.</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'cloud_labnote',
    title: 'Komunikasi & Dokumen (Cloud / Labnote)',
    icon: <MessageSquare className="w-5 h-5 text-sky-500" />,
    content: (
      <div className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Labnote Board:</strong> Portal pengumuman resmi & informasi operasional antar seksi. Karyawan dapat membaca edaran K3, SOP terbaru, dan saling bertukar komentar progres.
          </li>
          <li>
            <strong>PrepLab Cloud:</strong> Penyimpanan berkas terpadu pengganti drive lokal. Menyimpan dokumen statis seperti SOP perusahaan, panduan teknis alat (MSDS), dan arsip tahunan.
          </li>
          <li>
            <strong>Modul Quiz:</strong> Pengujian pemahaman K3 rutin karyawan dengan rekapan persentase kelulusan otomatis ke manajemen.
          </li>
        </ul>
      </div>
    )
  }
];

export function UserManualScreen({ 
  onBack,
  onNav 
}: { 
  onBack: () => void;
  onNav?: (tab: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<'interactive' | 'docs'>('interactive');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedTutorialId, setExpandedTutorialId] = useState<string | null>('homepage');
  const [openDocSection, setOpenDocSection] = useState<string | null>('roles');
  
  // Role testing selector (for verifying role-tailored Action Center steps)
  const [testRole, setTestRole] = useState<string>('current');

  // Filter tutorials
  const filteredTutorials = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return INTERACTIVE_TUTORIALS.filter(t => {
      const matchQuery = !q || 
        t.title.toLowerCase().includes(q) || 
        t.moduleName.toLowerCase().includes(q) || 
        t.description.toLowerCase().includes(q) ||
        t.steps.some(s => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
      
      const matchCat = categoryFilter === 'all' || 
        (categoryFilter === 'available' ? t.isAvailable : t.category === categoryFilter);

      return matchQuery && matchCat;
    });
  }, [searchQuery, categoryFilter]);

  // Handle Launching In-App Interactive Tutorial
  const handleLaunchTutorial = (tutorial: InteractiveTutorialItem) => {
    if (!tutorial.isAvailable) {
      toast.info(`Tutorial interaktif untuk modul "${tutorial.moduleName}" sedang dalam tahap finalisasi.`);
      return;
    }

    if (tutorial.id === 'homepage') {
      // Set auto-start flag
      sessionStorage.setItem('preplab_auto_start_home_tour', 'true');
      
      // If testing a specific role, set the simulated preview role
      if (testRole !== 'current') {
        sessionStorage.setItem('preplab_tour_preview_role', testRole);
      } else {
        sessionStorage.removeItem('preplab_tour_preview_role');
      }

      toast.success('Membuka Beranda & memulai simulasi tutorial interaktif...', { duration: 2000 });

      // Navigate to home with tour query param
      if (onNav) {
        onNav('home?tour=home');
      } else {
        window.location.href = '/home?tour=home';
      }

      // Dispatch event in case HomeScreen is already mounted
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('preplab:start_home_tutorial'));
      }, 80);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#121212] pb-24 md:pb-12 text-slate-800 dark:text-slate-100 animate-in fade-in duration-300">
      {/* Top Header Sticky Bar */}
      <div className="bg-white dark:bg-[#1a1a1a] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-300 cursor-pointer active:scale-95"
              title="Kembali ke Beranda"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2 font-display">
                <Compass className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                Pusat Tutorial &amp; Panduan Interaktif
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Simulasi in-app panduan modul dan dokumentasi alur kerja PrepLab
              </p>
            </div>
          </div>

          {/* Tab Switcher: In-App Tour vs Dokumentasi Tertulis */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('interactive')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'interactive'
                  ? 'bg-white dark:bg-[#252525] text-teal-700 dark:text-teal-300 font-bold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tutorial In-App</span>
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'docs'
                  ? 'bg-white dark:bg-[#252525] text-teal-700 dark:text-teal-300 font-bold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>SOP Manual</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 mt-5 space-y-5">
        {/* Hero Banner Notification */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-transparent border border-teal-500/30 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-600 text-white shadow-2xs">
                FITUR BARU
              </span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-display">
                Simulasi Tutorial Langsung di Layar Anda
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              Lupa letak menu atau cara menggunakan fitur? Klik <strong>"Jalankan Tutorial"</strong> pada modul di bawah ini untuk memulai panduan langkah demi langkah dengan sorotan elemen interaktif secara nyata.
            </p>
          </div>
          <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-600 dark:text-teal-400 items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari tutorial modul... (Homepage, Logbook, Labnote, Inspeksi, WO, APD, dll)"
              className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1a1a] text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-all shadow-xs placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {activeTab === 'interactive' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-semibold">
              {[
                { id: 'all', label: 'Semua Modul' },
                { id: 'available', label: 'Tersedia Sekarang (In-App)' },
                { id: 'ops', label: 'Logbook & Operasional' },
                { id: 'safety', label: 'K3 & Inspeksi' },
                { id: 'maintenance', label: 'Work Order & Unit' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer ${
                    categoryFilter === cat.id
                      ? 'bg-teal-600 text-white font-bold shadow-2xs'
                      : 'bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── TAB 1: INTERACTIVE TUTORIAL LIST ── */}
        {activeTab === 'interactive' && (
          <div className="space-y-4">
            {filteredTutorials.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-[#1a1a1a] rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <Search className="w-8 h-8 mx-auto text-slate-400 opacity-50" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Tutorial tidak ditemukan</p>
                <p className="text-xs text-slate-500">Tidak ada modul yang cocok dengan kata kunci "{searchQuery}".</p>
              </div>
            ) : (
              filteredTutorials.map(tutorial => {
                const isExpanded = expandedTutorialId === tutorial.id;
                return (
                  <div
                    key={tutorial.id}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      tutorial.isAvailable
                        ? 'bg-white dark:bg-[#1a1a1a] border-teal-500/40 shadow-sm hover:border-teal-500'
                        : 'bg-white/80 dark:bg-[#1a1a1a]/80 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {/* Header Card */}
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className={`p-2.5 rounded-xl border shrink-0 ${
                          tutorial.isAvailable 
                            ? 'bg-teal-500/15 border-teal-500/30' 
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                        }`}>
                          {tutorial.icon}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              tutorial.isAvailable
                                ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 animate-pulse'
                                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                            }`}>
                              {tutorial.badge}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400">
                              • {tutorial.stepCount} Langkah Panduan
                            </span>
                          </div>
                          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white font-display">
                            {tutorial.title}
                          </h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            {tutorial.description}
                          </p>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => setExpandedTutorialId(isExpanded ? null : tutorial.id)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span>{isExpanded ? 'Tutup Rincian' : 'Rincian'}</span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>

                        {tutorial.isAvailable ? (
                          <button
                            type="button"
                            onClick={() => handleLaunchTutorial(tutorial)}
                            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Jalankan Tutorial</span>
                          </button>
                        ) : (
                          <button
                            disabled
                            className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-semibold cursor-not-allowed opacity-75"
                          >
                            Segera Hadir
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Step-by-Step Breakdown */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#161616] p-4 sm:p-5 space-y-4"
                        >
                          {/* Role Verification & Testing Bar (For Admin / Testing Suitability) */}
                          {tutorial.id === 'homepage' && (
                            <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="space-y-0.5">
                                <span className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                                  <Eye className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                                  Uji Tampilan Role Action Center (Pemeriksa &amp; Tester)
                                </span>
                                <p className="text-[11px] text-teal-700 dark:text-teal-400 leading-snug">
                                  Pilih mode jabatan untuk memeriksa apakah penjelasan modul Action Center sudah sesuai dengan hak akses tiap pengguna.
                                </p>
                              </div>

                              <select
                                value={testRole}
                                onChange={(e) => setTestRole(e.target.value)}
                                className="px-3 py-1.5 rounded-lg border border-teal-300 dark:border-teal-700 bg-white dark:bg-[#1f1f1f] text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer shrink-0"
                              >
                                <option value="current">● Role Akun Saya Saat Ini</option>
                                <option value="superintendent">⭐ Mode Superintendent (SPT)</option>
                                <option value="manager">👑 Mode Manajemen (Manager)</option>
                                <option value="supervisor">🛡️ Mode Supervisor (SPV)</option>
                                <option value="operator">👷 Mode Operator / Crew / Staff</option>
                              </select>
                            </div>
                          )}

                          {/* Steps Grid */}
                          <div className="space-y-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                              Tahapan Simulasi Yang Akan Dijalankan:
                            </span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                              {tutorial.steps.map((st, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1c1c1c] space-y-1 text-xs"
                                >
                                  <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                    <span className="w-5 h-5 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-mono font-bold text-[10px]">
                                      {sIdx + 1}
                                    </span>
                                    <span>{st.title}</span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pl-6.5">
                                    {st.description}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Quick Launch Bottom Trigger */}
                          {tutorial.isAvailable && (
                            <div className="pt-2 flex items-center justify-between">
                              <span className="text-[11px] text-slate-400 italic">
                                Klik tombol di kanan untuk langsung diarahkan ke layar Beranda dan memulai simulasi.
                              </span>
                              <button
                                type="button"
                                onClick={() => handleLaunchTutorial(tutorial)}
                                className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span>Mulai Tutorial Sekarang</span>
                              </button>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── TAB 2: PROCEDURAL SOP & TEXT DOCUMENTATION ── */}
        {activeTab === 'docs' && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300">
              Dokumentasi referensi lengkap alur peran, pembagian hak akses, dan SOP sistem operasional PrepLab.
            </div>

            {SOP_DOCUMENTATION.map(doc => {
              const isOpen = openDocSection === doc.id;
              return (
                <div 
                  key={doc.id}
                  className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-[#1a1a1a] shadow-xs"
                >
                  <button 
                    onClick={() => setOpenDocSection(isOpen ? null : doc.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                        {doc.icon}
                      </div>
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{doc.title}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#161616]">
                          <div className="mt-3">
                            {doc.content}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Note */}
        <div className="pt-6 text-center text-xs text-slate-400 pb-4 space-y-1">
          <p>PrepLab All-In-One Portal &copy; {new Date().getFullYear()} • Modul Panduan Interaktif</p>
          <p className="text-[11px] opacity-75">Tutorial interaktif akan terus ditambahkan bertahap untuk seluruh modul operasional.</p>
        </div>
      </div>
    </div>
  );
}
