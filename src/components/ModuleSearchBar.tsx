import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  CheckSquare, 
  AlertTriangle, 
  ClipboardCheck, 
  Users, 
  ThermometerSun, 
  Wrench, 
  FileText, 
  BookOpen, 
  Package, 
  LineChart, 
  BriefcaseMedical, 
  Calendar, 
  Activity, 
  LayoutDashboard,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Camera,
  Layers
} from 'lucide-react';

export interface PortalModuleItem {
  id: string;
  title: string;
  desc: string;
  category: 'K3 & Operasional' | 'Pelaporan & Temuan' | 'Administrasi & SDM' | 'Fasilitas & Penunjang';
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  tags: string[];
  actionType: 'nav' | 'kta' | 'p5m' | 'link';
  target: string;
  roles?: string[]; // optional restriction
}

interface ModuleSearchBarProps {
  inspectorNik?: string | null;
  inspectorName?: string | null;
  inspectorRole?: string | null;
  inspectorSection?: string | null;
  onNav: (tab: string) => void;
  onOpenKta?: () => void;
  onOpenP5m?: () => void;
  className?: string;
}

export const ALL_PORTAL_MODULES: PortalModuleItem[] = [
  {
    id: 'inspect',
    title: 'Pemeriksaan Harian (P2H)',
    desc: 'Checklist pra-operasi unit & alat kerja harian',
    category: 'K3 & Operasional',
    icon: <CheckSquare className="w-5 h-5" />,
    iconBg: 'bg-teal-500/15 border-teal-500/25',
    iconColor: 'text-teal-600 dark:text-teal-400',
    tags: ['p2h', 'inspeksi', 'alat', 'harian', 'checklist', 'kendaraan', 'unit', 'mesin'],
    actionType: 'nav',
    target: 'inspect'
  },
  {
    id: 'weekly-inspection',
    title: 'Inspeksi Mingguan K3',
    desc: 'Inspeksi terencana area kerja, housekeeping & fasilitas',
    category: 'K3 & Operasional',
    icon: <ClipboardCheck className="w-5 h-5" />,
    iconBg: 'bg-amber-500/15 border-amber-500/25',
    iconColor: 'text-amber-600 dark:text-amber-400',
    tags: ['inspeksi', 'mingguan', 'k3', 'jadwal', 'lingkungan', 'audit', 'area'],
    actionType: 'nav',
    target: 'weekly-inspection'
  },
  {
    id: 'kta',
    title: 'Lapor Bahaya KTA & TTA',
    desc: 'Formulir pelaporan kondisi & tindakan tidak aman',
    category: 'Pelaporan & Temuan',
    icon: <Camera className="w-5 h-5" />,
    iconBg: 'bg-orange-500/15 border-orange-500/25',
    iconColor: 'text-orange-600 dark:text-orange-400',
    tags: ['kta', 'tta', 'bahaya', 'unsafe', 'lapor', 'hazard', 'safety', 'foto'],
    actionType: 'kta',
    target: 'kta'
  },
  {
    id: 'p5m',
    title: 'Materi & Penugasan P5M',
    desc: 'Jadwal pemateri & materi briefing safety talk harian',
    category: 'K3 & Operasional',
    icon: <Users className="w-5 h-5" />,
    iconBg: 'bg-sky-500/15 border-sky-500/25',
    iconColor: 'text-sky-600 dark:text-sky-400',
    tags: ['p5m', 'briefing', 'materi', 'safety talk', 'pemateri', 'jadwal', 'flyer'],
    actionType: 'p5m',
    target: 'p5m'
  },
  {
    id: 'pemantauan',
    title: 'Pemantauan Lab (Suhu & Gas)',
    desc: 'Pencatatan suhu ruangan & tekanan tabung gas harian',
    category: 'K3 & Operasional',
    icon: <ThermometerSun className="w-5 h-5" />,
    iconBg: 'bg-indigo-500/15 border-indigo-500/25',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    tags: ['suhu', 'gas', 'pemantauan', 'lab', 'laboratorium', 'argon', 'helium', 'ruangan'],
    actionType: 'nav',
    target: 'pemantauan'
  },
  {
    id: 'bulletin',
    title: 'Buletin K3 & Pengumuman',
    desc: 'Pusat informasi K3, pengumuman divisi & buletin berkala',
    category: 'Fasilitas & Penunjang',
    icon: <FileText className="w-5 h-5" />,
    iconBg: 'bg-emerald-500/15 border-emerald-500/25',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    tags: ['buletin', 'pengumuman', 'informasi', 'artikel', 'berita', 'k3'],
    actionType: 'nav',
    target: 'bulletin/TBP'
  },
  {
    id: 'logbook',
    title: 'Log Book Section',
    desc: 'Catatan serah terima shift & rekap aktivitas harian',
    category: 'K3 & Operasional',
    icon: <Layers className="w-5 h-5" />,
    iconBg: 'bg-teal-500/15 border-teal-500/25',
    iconColor: 'text-teal-600 dark:text-teal-400',
    tags: ['logbook', 'shift', 'serah terima', 'catatan', 'harian', 'tugas'],
    actionType: 'nav',
    target: 'logbook'
  },
  {
    id: 'clinic',
    title: 'Kunjungan Klinik',
    desc: 'Pencatatan & pemantauan riwayat berobat personil',
    category: 'Fasilitas & Penunjang',
    icon: <BriefcaseMedical className="w-5 h-5" />,
    iconBg: 'bg-rose-500/15 border-rose-500/25',
    iconColor: 'text-rose-600 dark:text-rose-400',
    tags: ['klinik', 'obat', 'sakit', 'kesehatan', 'berobat', 'dokter', 'medis'],
    actionType: 'nav',
    target: 'clinic'
  },
  {
    id: 'roster-admin',
    title: 'Roster & Cuti Kerja',
    desc: 'Jadwal shift kerja harian & status roster personil',
    category: 'Administrasi & SDM',
    icon: <Calendar className="w-5 h-5" />,
    iconBg: 'bg-blue-500/15 border-blue-500/25',
    iconColor: 'text-blue-600 dark:text-blue-400',
    tags: ['roster', 'cuti', 'shift', 'jadwal', 'absensi', 'libur'],
    actionType: 'nav',
    target: 'roster-admin'
  },
  {
    id: 'agenda',
    title: 'Agenda Personal',
    desc: 'Kalender kegiatan, reminder & agenda penting divisi',
    category: 'Administrasi & SDM',
    icon: <Clock className="w-5 h-5" />,
    iconBg: 'bg-purple-500/15 border-purple-500/25',
    iconColor: 'text-purple-600 dark:text-purple-400',
    tags: ['agenda', 'kalender', 'jadwal', 'kegiatan', 'reminder', 'tugas'],
    actionType: 'nav',
    target: 'agenda'
  },
  {
    id: 'quiz',
    title: 'Quiz Safety & Prosedur',
    desc: 'Uji pemahaman standar operasional & keselamatan kerja',
    category: 'Fasilitas & Penunjang',
    icon: <BookOpen className="w-5 h-5" />,
    iconBg: 'bg-amber-500/15 border-amber-500/25',
    iconColor: 'text-amber-600 dark:text-amber-400',
    tags: ['quiz', 'soal', 'ujian', 'prosedur', 'sop', 'training', 'belajar'],
    actionType: 'nav',
    target: 'quiz'
  },
  {
    id: 'leaderboard',
    title: 'Hall of Fame & Rank',
    desc: 'Tangga kemahiran operasional & papan peringkat personil',
    category: 'Fasilitas & Penunjang',
    icon: <Sparkles className="w-5 h-5" />,
    iconBg: 'bg-amber-500/15 border-amber-500/25',
    iconColor: 'text-amber-600 dark:text-amber-400',
    tags: ['rank', 'peringkat', 'leaderboard', 'exp', 'prestasi', 'vanguard'],
    actionType: 'nav',
    target: 'leaderboard'
  },
  {
    id: 'wo-list',
    title: 'Daftar Work Order (WO)',
    desc: 'Monitoring riwayat & status perbaikan unit/peralatan',
    category: 'K3 & Operasional',
    icon: <Wrench className="w-5 h-5" />,
    iconBg: 'bg-slate-500/15 border-slate-500/25',
    iconColor: 'text-slate-700 dark:text-slate-300',
    tags: ['wo', 'work order', 'perbaikan', 'maintenance', 'bengkel', 'antrean'],
    actionType: 'nav',
    target: 'wo-list'
  },
  {
    id: 'create-wo',
    title: 'Buat Work Order (WO)',
    desc: 'Formulir pengajuan perbaikan unit atau alat rusak',
    category: 'K3 & Operasional',
    icon: <Wrench className="w-5 h-5" />,
    iconBg: 'bg-rose-500/15 border-rose-500/25',
    iconColor: 'text-rose-600 dark:text-rose-400',
    tags: ['buat wo', 'rusak', 'kerusakan', 'perbaikan', 'tiket', 'maintenance'],
    actionType: 'nav',
    target: 'create-wo'
  },
  {
    id: 'wo-maintenance-dashboard',
    title: 'Dashboard Maintenance',
    desc: 'Analisis kerusakan unit, MTTR, & ketersediaan alat',
    category: 'Pelaporan & Temuan',
    icon: <LineChart className="w-5 h-5" />,
    iconBg: 'bg-rose-500/15 border-rose-500/25',
    iconColor: 'text-rose-600 dark:text-rose-400',
    tags: ['maintenance', 'breakdown', 'downtime', 'dashboard', 'spv', 'unit'],
    actionType: 'nav',
    target: 'wo-maintenance-dashboard'
  },
  {
    id: 'downtime',
    title: 'Downtime Peralatan',
    desc: 'Pencatatan stop operasional & waktu henti alat',
    category: 'K3 & Operasional',
    icon: <Activity className="w-5 h-5" />,
    iconBg: 'bg-orange-500/15 border-orange-500/25',
    iconColor: 'text-orange-600 dark:text-orange-400',
    tags: ['downtime', 'stop', 'alat', 'delay', 'rusak', 'jam kerja'],
    actionType: 'nav',
    target: 'downtime'
  },
  {
    id: 'apd-input',
    title: 'Distribusi APD',
    desc: 'Pencatatan distribusi alat pelindung diri karyawan',
    category: 'Administrasi & SDM',
    icon: <Package className="w-5 h-5" />,
    iconBg: 'bg-purple-500/15 border-purple-500/25',
    iconColor: 'text-purple-600 dark:text-purple-400',
    tags: ['apd', 'helm', 'rompi', 'sepatu', 'sarung tangan', 'distribusi', 'safety'],
    actionType: 'nav',
    target: 'apd-input'
  },
  {
    id: 'sap-dashboard',
    title: 'SAP Dashboard & Temuan',
    desc: 'Monitoring & penutupan temuan inspeksi terbuka',
    category: 'Pelaporan & Temuan',
    icon: <ShieldCheck className="w-5 h-5" />,
    iconBg: 'bg-emerald-500/15 border-emerald-500/25',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    tags: ['sap', 'temuan', 'tindak lanjut', 'pic', 'audit', 'inspeksi'],
    actionType: 'nav',
    target: 'sap-dashboard'
  },
  {
    id: 'employee-database',
    title: 'Database Karyawan',
    desc: 'Direktori data personil, jabatan & seksi kerja',
    category: 'Administrasi & SDM',
    icon: <Users className="w-5 h-5" />,
    iconBg: 'bg-blue-500/15 border-blue-500/25',
    iconColor: 'text-blue-600 dark:text-blue-400',
    tags: ['karyawan', 'personil', 'kontak', 'nik', 'jabatan', 'database'],
    actionType: 'nav',
    target: 'employee-database'
  },
  {
    id: 'preplab-cloud',
    title: 'PrepLab Cloud Storage',
    desc: 'Penyimpanan arsip digital & dokumen operasional',
    category: 'Fasilitas & Penunjang',
    icon: <FileText className="w-5 h-5" />,
    iconBg: 'bg-teal-500/15 border-teal-500/25',
    iconColor: 'text-teal-600 dark:text-teal-400',
    tags: ['cloud', 'storage', 'file', 'dokumen', 'drive', 'berkas'],
    actionType: 'nav',
    target: 'preplab-cloud'
  }
];

const DEFAULT_RECENT_IDS = [
  'inspect',
  'weekly-inspection',
  'kta',
  'p5m',
  'bulletin',
  'pemantauan'
];

export function ModuleSearchBar({
  inspectorNik,
  inspectorName,
  inspectorRole,
  inspectorSection,
  onNav,
  onOpenKta,
  onOpenP5m,
  className = ''
}: ModuleSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const storageKey = useMemo(() => {
    return `preplab_recent_modules_${inspectorNik || 'user'}`;
  }, [inspectorNik]);

  // Load recent modules specific to this personil
  const [recentIds, setRecentIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 6);
        }
      }
    } catch {}
    return DEFAULT_RECENT_IDS;
  });

  // Keep synced if inspectorNik changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentIds(parsed.slice(0, 6));
          return;
        }
      }
    } catch {}
    setRecentIds(DEFAULT_RECENT_IDS);
  }, [storageKey]);

  // Save selected module to recent history
  const recordModuleClick = (moduleId: string) => {
    setRecentIds(prev => {
      const next = [moduleId, ...prev.filter(id => id !== moduleId)].slice(0, 6);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter modules based on search query
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return ALL_PORTAL_MODULES.filter(m => {
      const inTitle = m.title.toLowerCase().includes(q);
      const inDesc = m.desc.toLowerCase().includes(q);
      const inTags = m.tags.some(t => t.includes(q));
      const inCat = m.category.toLowerCase().includes(q);
      return inTitle || inDesc || inTags || inCat;
    });
  }, [query]);

  // Map the 6 recent modules objects
  const recentModules = useMemo(() => {
    const map = new Map(ALL_PORTAL_MODULES.map(m => [m.id, m]));
    const result: PortalModuleItem[] = [];
    for (const id of recentIds) {
      const item = map.get(id);
      if (item) result.push(item);
    }
    // Fill with defaults if less than 6
    if (result.length < 6) {
      for (const defId of DEFAULT_RECENT_IDS) {
        if (!result.some(r => r.id === defId)) {
          const item = map.get(defId);
          if (item) result.push(item);
        }
        if (result.length >= 6) break;
      }
    }
    return result.slice(0, 6);
  }, [recentIds]);

  // Handle module click
  const handleLaunchModule = (item: PortalModuleItem) => {
    recordModuleClick(item.id);
    setQuery('');
    setIsFocused(false);

    if (item.actionType === 'kta') {
      if (onOpenKta) {
        onOpenKta();
      } else {
        window.dispatchEvent(new CustomEvent('open-simplified-inspection', { detail: { tab: 'kta_tta' } }));
      }
    } else if (item.actionType === 'p5m') {
      if (onOpenP5m) {
        onOpenP5m();
      } else {
        window.dispatchEvent(new CustomEvent('open-simplified-p5m-modal'));
      }
    } else {
      onNav(item.target);
    }
  };

  return (
    <div ref={containerRef} className={`w-full space-y-4 ${className}`}>
      {/* ── 1. MODERN SEARCH BAR ── */}
      <div className="relative w-full">
        <div 
          className={`flex items-center gap-3 px-4 py-3 sm:py-3.5 rounded-2xl border transition-all duration-200 shadow-sm ${
            isFocused
              ? 'bg-white dark:bg-slate-900 border-teal-500 ring-2 ring-teal-500/20 shadow-md'
              : 'bg-white/80 dark:bg-slate-850/80 hover:bg-white dark:hover:bg-slate-850 border-slate-200 dark:border-slate-800'
          }`}
        >
          <Search className={`w-5 h-5 shrink-0 transition-colors ${
            isFocused ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'
          }`} />
          
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder="Cari modul atau tugas... (KTA, P2H, Inspeksi, Buletin, Roster, dll)"
            className="w-full bg-transparent text-sm text-[var(--text-main,#0f172a)] placeholder:text-slate-400 focus:outline-hidden"
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Bersihkan pencarian"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── LIVE SEARCH RESULTS OR RECENT RECOMMENDATIONS DROPDOWN ── */}
        {isFocused && (
          <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-2 max-h-[380px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
            {query.trim().length > 0 ? (
              searchResults.length > 0 ? (
                <div className="space-y-1">
                  <div className="px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Hasil Pencarian ({searchResults.length})</span>
                    <span>Klik untuk buka</span>
                  </div>
                  {searchResults.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleLaunchModule(item)}
                      className="flex items-center justify-between p-2.5 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${item.iconBg} ${item.iconColor}`}>
                          {item.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[var(--text-main,#0f172a)] group-hover:text-teal-600 dark:group-hover:text-teal-400 truncate">
                              {item.title}
                            </span>
                            <span className="text-[9.5px] px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium shrink-0">
                              {item.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 group-hover:translate-x-0.5 transition-transform shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Tidak ada modul yang cocok dengan &ldquo;{query}&rdquo;
                </div>
              )
            ) : (
              /* When focused with empty query: show 6 recent recommended modules as list with logos */
              <div className="space-y-1">
                <div className="px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-teal-600" />
                    Rekomendasi Modul Sering Diakses
                  </span>
                  <span className="text-[9.5px] text-slate-400">Pilihan Cepat</span>
                </div>
                {recentModules.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => handleLaunchModule(item)}
                    className="flex items-center justify-between p-2.5 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${item.iconBg} ${item.iconColor}`}>
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--text-main,#0f172a)] group-hover:text-teal-600 dark:group-hover:text-teal-400 truncate">
                            {item.title}
                          </span>
                          <span className="text-[9.5px] px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium shrink-0">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] font-semibold text-slate-400">
                        #{idx + 1}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
