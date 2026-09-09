import React, { useState, useEffect, useRef } from 'react';
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  Play, 
  Pause, 
  RotateCcw, 
  Camera, 
  Sparkles, 
  Upload, 
  Image as ImageIcon, 
  RotateCcw as ResetIcon, 
  X, 
  Check, 
  Loader2,
  ChevronRight,
  Shield,
  ShieldAlert,
  ShieldCheck,
  FlaskConical,
  Hammer,
  Wrench,
  Package,
  Award,
  AlertTriangle,
  FileText,
  Info,
  BookOpen,
  Clock,
  Music,
  Volume2,
  Wind,
  Droplets,
  MapPin,
  FolderOpen,
  ExternalLink,
  Calendar,
  Compass,
  Layers,
  Radio,
  Sliders,
  SkipForward,
  SkipBack,
  Bookmark,
  CheckCircle2,
  Activity
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

const WeatherIcon = ({ code, className }: { code: number, className?: string }) => {
  if (code < 3) return <Sun className={`text-amber-400 ${className}`} />;
  if (code < 50) return <Cloud className={`text-sky-300 ${className}`} />;
  return <CloudRain className={`text-blue-400 ${className}`} />;
};

interface TbpDashboardProps {
  posts: any[];
  onSelectPost: (post: any) => void;
}

interface DashboardMediaSettings {
  banner?: string;
  gallery_1?: string;
  gallery_2?: string;
  gallery_3?: string;
  gallery_4?: string;
  lofi?: string;
}

const DEFAULT_MEDIA: DashboardMediaSettings = {
  banner: '/images/dashboard/prep_lab_banner.jpg',
  gallery_1: '/images/dashboard/gallery_1.jpg',
  gallery_2: '/images/dashboard/gallery_2.jpg',
  gallery_3: '/images/dashboard/gallery_3.jpg',
  gallery_4: '/images/dashboard/gallery_4.jpg',
  lofi: '/images/dashboard/lofi_girl.jpg'
};

const PRESET_WALLPAPERS = [
  {
    id: 'cyber_lab',
    name: 'Cyber Lab Neon',
    category: 'Laboratory',
    url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1600&q=80',
    thumb: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=300&q=60'
  },
  {
    id: 'clean_chem',
    name: 'Cleanroom Analytical',
    category: 'Laboratory',
    url: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=1600&q=80',
    thumb: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=300&q=60'
  },
  {
    id: 'spectrometry',
    name: 'Spectrometry Instrument',
    category: 'Laboratory',
    url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=1600&q=80',
    thumb: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=300&q=60'
  },
  {
    id: 'open_pit',
    name: 'Golden Pit Sunset',
    category: 'Mining & Prep',
    url: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1600&q=80',
    thumb: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=300&q=60'
  },
  {
    id: 'heavy_machinery',
    name: 'Excavator & Mining',
    category: 'Mining & Prep',
    url: 'https://images.unsplash.com/photo-1508873696983-2df5293cb395?auto=format&fit=crop&w=1600&q=80',
    thumb: 'https://images.unsplash.com/photo-1508873696983-2df5293cb395?auto=format&fit=crop&w=300&q=60'
  },
  {
    id: 'nickel_crusher',
    name: 'Industrial Processing',
    category: 'Mining & Prep',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1600&q=80',
    thumb: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=300&q=60'
  },
  {
    id: 'emerald_aurora',
    name: 'Emerald Aurora',
    category: 'Futuristic',
    url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1600&q=80',
    thumb: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=300&q=60'
  },
  {
    id: 'deep_ultraviolet',
    name: 'Deep Ultraviolet',
    category: 'Futuristic',
    url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1600&q=80',
    thumb: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=300&q=60'
  },
  {
    id: 'lofi_vibes',
    name: 'Lofi Study Night',
    category: 'Vibes',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
    thumb: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=60'
  }
];

export function TbpDashboard({ posts, onSelectPost }: TbpDashboardProps) {
  const [time, setTime] = useState(new Date());
  const [mediaSettings, setMediaSettings] = useState<DashboardMediaSettings>(() => {
    try {
      const cached = localStorage.getItem('preplab_bulletin_media');
      return cached ? { ...DEFAULT_MEDIA, ...JSON.parse(cached) } : DEFAULT_MEDIA;
    } catch {
      return DEFAULT_MEDIA;
    }
  });

  // Modal State for customizer
  const [activeSlot, setActiveSlot] = useState<{ key: keyof DashboardMediaSettings; label: string } | null>(null);
  const [customizerTab, setCustomizerTab] = useState<'upload' | 'preset'>('preset');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with /api/settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const all = await res.json();
          const found = all.find((s: any) => s.settingKey === 'bulletin_dashboard_media');
          if (found && found.settingValue) {
            const parsed = JSON.parse(found.settingValue);
            setMediaSettings(prev => {
              const merged = { ...prev, ...parsed };
              localStorage.setItem('preplab_bulletin_media', JSON.stringify(merged));
              return merged;
            });
          }
        }
      } catch (e) {
        console.error('Failed to load dashboard media settings:', e);
      }
    };
    fetchSettings();
  }, []);
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleNav = (title: string) => {
    const searchStr = title.toLowerCase().trim();
    
    // 1. Exact match (cleaned of markdown formatting)
    let post = posts.find(p => {
      const clean = (p.title || '').replace(/^[#\s\-*]+/, '').trim().toLowerCase();
      return clean === searchStr;
    });
    
    // 2. Exact match with "Information " or "Section " prefix
    if (!post) {
      post = posts.find(p => {
        const clean = (p.title || '').replace(/^[#\s\-*]+/, '').trim().toLowerCase();
        return clean === `information ${searchStr}` || clean === `section ${searchStr}`;
      });
    }

    // 3. Category / Section exact match
    if (!post) {
      post = posts.find(p => {
        const cat = (p.category || p.section || '').toLowerCase().trim();
        const clean = (p.title || '').replace(/^[#\s\-*]+/, '').trim().toLowerCase();
        return cat === searchStr && !clean.includes('identifikasi') && !clean.includes('pengecekan');
      });
    }

    // 4. Fallback starting with searchStr (avoiding random substring matches)
    if (!post) {
      post = posts.find(p => {
        const clean = (p.title || '').replace(/^[#\s\-*]+/, '').trim().toLowerCase();
        return clean.startsWith(searchStr);
      });
    }

    if (post) {
      onSelectPost(post);
    } else {
      alert(`Halaman '${title}' belum ditemukan.`);
    }
  };

  // Save new media URL
  const handleSaveMedia = async (slotKey: keyof DashboardMediaSettings, url: string) => {
    setIsSaving(true);
    try {
      const updated = { ...mediaSettings, [slotKey]: url };
      setMediaSettings(updated);
      localStorage.setItem('preplab_bulletin_media', JSON.stringify(updated));

      // Save to backend settings
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settingKey: 'bulletin_dashboard_media',
          settingValue: JSON.stringify(updated),
          description: 'Custom Bulletin Homepage Canvases & Wallpapers'
        })
      });

      toast.success('Foto canvas berhasil diperbarui!');
      setActiveSlot(null);
    } catch (e) {
      toast.error('Gagal menyimpan foto canvas');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset slot to default
  const handleResetMedia = async (slotKey: keyof DashboardMediaSettings) => {
    const defaultUrl = DEFAULT_MEDIA[slotKey];
    if (defaultUrl) {
      await handleSaveMedia(slotKey, defaultUrl);
    }
  };

  // Client-side image compression
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSlot) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Pilih file gambar yang valid (JPG, PNG, WebP)');
      return;
    }

    toast.loading('Memproses & mengompres gambar...', { id: 'canvas-img' });
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 1600;
        const maxH = 1000;
        let width = img.width;
        let height = img.height;

        if (width > maxW || height > maxH) {
          if (width > height) {
            height = Math.round((height * maxW) / width);
            width = maxW;
          } else {
            width = Math.round((width * maxH) / height);
            height = maxH;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          toast.dismiss('canvas-img');
          handleSaveMedia(activeSlot.key, compressed);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const [isPlaying, setIsPlaying] = useState(false);

  const sectionItems = [
    {
      title: 'Information',
      subtitle: 'Pengumuman resmi, memo internal & update site',
      badge: 'INFO',
      icon: Info,
      colorClass: 'text-sky-500 dark:text-sky-400',
      bgClass: 'bg-sky-500/10 dark:bg-sky-500/20',
      borderClass: 'border-sky-500/20 group-hover:border-sky-500/40',
      badgeBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
    },
    {
      title: 'Administrasi',
      subtitle: 'Tata kelola kantor, surat menyurat & kepegawaian',
      badge: 'OFFICE',
      icon: FileText,
      colorClass: 'text-indigo-500 dark:text-indigo-400',
      bgClass: 'bg-indigo-500/10 dark:bg-indigo-500/20',
      borderClass: 'border-indigo-500/20 group-hover:border-indigo-500/40',
      badgeBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
    },
    {
      title: 'Laboratorium',
      subtitle: 'Analisa AAS, XRF, titrasi basah & instrumen analitik',
      badge: 'LAB',
      icon: FlaskConical,
      colorClass: 'text-emerald-500 dark:text-emerald-400',
      bgClass: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      borderClass: 'border-emerald-500/20 group-hover:border-emerald-500/40',
      badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    },
    {
      title: 'Preparasi',
      subtitle: 'Crushing bijih nikel, drying, pulverizing & sampling',
      badge: 'PLANT',
      icon: Hammer,
      colorClass: 'text-amber-500 dark:text-amber-400',
      bgClass: 'bg-amber-500/10 dark:bg-amber-500/20',
      borderClass: 'border-amber-500/20 group-hover:border-amber-500/40',
      badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    },
    {
      title: 'Maintenance',
      subtitle: 'Perawatan mesin, kalibrasi sensor & perbaikan teknis',
      badge: 'TEKNIK',
      icon: Wrench,
      colorClass: 'text-orange-500 dark:text-orange-400',
      bgClass: 'bg-orange-500/10 dark:bg-orange-500/20',
      borderClass: 'border-orange-500/20 group-hover:border-orange-500/40',
      badgeBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20'
    },
    {
      title: 'Inventory',
      subtitle: 'Stok reagen kimia, consumables & suku cadang mesin',
      badge: 'LOGISTIK',
      icon: Package,
      colorClass: 'text-cyan-500 dark:text-cyan-400',
      bgClass: 'bg-cyan-500/10 dark:bg-cyan-500/20',
      borderClass: 'border-cyan-500/20 group-hover:border-cyan-500/40',
      badgeBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
    },
    {
      title: 'Manajemen Mutu',
      subtitle: 'Standar akreditasi ISO 17025, QA/QC & compliance',
      badge: 'ISO 17025',
      icon: Award,
      colorClass: 'text-purple-500 dark:text-purple-400',
      bgClass: 'bg-purple-500/10 dark:bg-purple-500/20',
      borderClass: 'border-purple-500/20 group-hover:border-purple-500/40',
      badgeBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
    },
    {
      title: 'General Issue',
      subtitle: 'Pusat troubleshooting, kendala shift & tindak lanjut',
      badge: 'ISSUES',
      icon: AlertTriangle,
      colorClass: 'text-rose-500 dark:text-rose-400',
      bgClass: 'bg-rose-500/10 dark:bg-rose-500/20',
      borderClass: 'border-rose-500/20 group-hover:border-rose-500/40',
      badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
    },
    {
      title: 'Prosedur',
      subtitle: 'Instruksi Kerja (IK), SOP & panduan teknis operasional',
      badge: 'SOP',
      icon: BookOpen,
      colorClass: 'text-teal-500 dark:text-teal-400',
      bgClass: 'bg-teal-500/10 dark:bg-teal-500/20',
      borderClass: 'border-teal-500/20 group-hover:border-teal-500/40',
      badgeBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20'
    }
  ];

  const ruleItems = [
    {
      target: 'Administrasi',
      title: 'Administrasi',
      subtitle: 'Regulasi kepatuhan administrasi & pelaporan data',
      badge: 'REG-01',
      icon: FileText,
      colorClass: 'text-indigo-400',
      bgClass: 'bg-indigo-500/10',
      borderClass: 'border-indigo-500/20'
    },
    {
      target: 'Laboratorium',
      title: 'Laboratorium',
      subtitle: 'Protokol K3LL kimia, penanganan B3 & fuming hood',
      badge: 'K3LL LAB',
      icon: ShieldAlert,
      colorClass: 'text-rose-400',
      bgClass: 'bg-rose-500/10',
      borderClass: 'border-rose-500/20'
    },
    {
      target: 'Manajemen Mutu',
      title: 'Manajemen Mutu',
      subtitle: 'Validasi analisa, integritas data & akreditasi ISO 17025',
      badge: 'ISO 17025',
      icon: ShieldCheck,
      colorClass: 'text-emerald-400',
      bgClass: 'bg-emerald-500/10',
      borderClass: 'border-emerald-500/20'
    },
    {
      target: 'Preparasi',
      title: 'Preparasi',
      subtitle: 'Kepatuhan APD lengkap, dust collector & crusher',
      badge: 'APD WAJIB',
      icon: Shield,
      colorClass: 'text-amber-400',
      bgClass: 'bg-amber-500/10',
      borderClass: 'border-amber-500/20'
    },
    {
      target: 'Maintenance',
      title: 'Maintenance',
      subtitle: 'Lockout-Tagout (LOTO), isolasi energi & perbaikan alat',
      badge: 'LOTO SAFETY',
      icon: Wrench,
      colorClass: 'text-orange-400',
      bgClass: 'bg-orange-500/10',
      borderClass: 'border-orange-500/20'
    }
  ];

  return (
    <div 
      className="w-full h-full overflow-y-auto transition-colors"
      style={{
        backgroundColor: 'var(--bg-main, #1e1e1e)',
        color: 'var(--text-main, #e2e8f0)'
      }}
    >
      {/* 1. Header Banner Canvas */}
      <div className="w-full h-48 md:h-64 lg:h-80 relative overflow-hidden group">
        <img 
          src={mediaSettings.banner || DEFAULT_MEDIA.banner} 
          alt="Banner" 
          className="w-full h-full object-cover object-center brightness-90 group-hover:scale-102 transition-all duration-700" 
        />
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{
            background: 'linear-gradient(to top, var(--bg-main, #1e1e1e) 0%, transparent 60%, rgba(0,0,0,0.3) 100%)'
          }}
        />
        
        {/* Floating Site Badge over Banner */}
        <div className="absolute bottom-4 left-6 md:left-12 flex items-center gap-2">
          <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-semibold flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Site Kawasi • Pulau Obi</span>
          </div>
          <div className="hidden sm:flex px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white/80 text-xs font-mono">
            Prep & Analytical Lab Portal
          </div>
        </div>

        {/* Change Banner Button */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setActiveSlot({ key: 'banner', label: 'Header Banner Utama' })}
            className="px-3.5 py-1.5 rounded-xl bg-black/70 hover:bg-black/90 backdrop-blur-md text-white text-xs font-semibold border border-white/30 shadow-lg flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-teal-400" />
            <span>Ganti Banner</span>
          </button>
        </div>
      </div>

      <div className="px-6 md:px-12 py-8 w-full space-y-8">
        {/* Title Bar with Status Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md font-bold"
              style={{ backgroundColor: 'var(--primary, #2A9D8F)' }}
            >
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-display font-extrabold tracking-tight" style={{ color: 'var(--text-main, #ffffff)' }}>
                  PT. TBP & GPS
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-teal-500/10 text-teal-500 border-teal-500/30">
                  VERIFIED SITE
                </span>
              </div>
              <p className="text-xs tracking-wide" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                Preparation & Analytical Laboratory Information Center • Harita Nickel
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div 
              className="px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-2 shadow-xs"
              style={{
                backgroundColor: 'var(--card-bg, rgba(255, 255, 255, 0.6))',
                borderColor: 'var(--border-main, rgba(148, 163, 184, 0.2))',
                color: 'var(--text-muted, #94a3b8)'
              }}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>281 Dokumen Tersedia</span>
            </div>
            <div 
              className="hidden md:flex px-3 py-1.5 rounded-xl border text-xs font-medium items-center gap-2 shadow-xs"
              style={{
                backgroundColor: 'var(--card-bg, rgba(255, 255, 255, 0.6))',
                borderColor: 'var(--border-main, rgba(148, 163, 184, 0.2))',
                color: 'var(--text-muted, #94a3b8)'
              }}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Canvas Customizable</span>
            </div>
          </div>
        </div>

        {/* 2. Gallery Canvas Cards (4 Slots) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {([1, 2, 3, 4] as const).map((num) => {
            const slotKey = `gallery_${num}` as keyof DashboardMediaSettings;
            const imgSrc = mediaSettings[slotKey] || DEFAULT_MEDIA[slotKey];
            const labels = [
              '🔬 Analytical Lab',
              '⛏ Mining & Prep',
              '⚙ Maintenance Unit',
              '📋 QA/QC Center'
            ];

            return (
              <div 
                key={num} 
                className="aspect-video rounded-2xl overflow-hidden shadow-lg border relative group transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]"
                style={{
                  backgroundColor: 'var(--card-bg, #161616)',
                  borderColor: 'var(--border-main, rgba(51, 65, 85, 0.5))'
                }}
              >
                <img 
                  src={imgSrc} 
                  alt={`Gallery ${num}`} 
                  className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700" 
                />
                
                {/* Subtle dark gradient overlay at bottom */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />

                {/* Bottom label */}
                <div className="absolute bottom-2.5 left-2.5 pointer-events-none">
                  <span className="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-white/90 text-[10px] font-semibold border border-white/20 shadow-md">
                    {labels[num - 1]}
                  </span>
                </div>

                {/* Overlay with Change Photo Button */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                  <button
                    onClick={() => setActiveSlot({ key: slotKey, label: `Gallery Canvas #${num}` })}
                    className="px-3 py-1.5 rounded-xl bg-black/80 hover:bg-teal-900/90 text-white text-[11px] font-bold border border-teal-500/50 shadow-xl flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-sm"
                  >
                    <Camera className="w-3 h-3 text-teal-300" />
                    <span>Ganti Foto</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
          {/* Left Column: Sections & Rules */}
          <div className="lg:col-span-5 space-y-6">
            {/* WORKSTATION SECTIONS CARD */}
            <div 
              className="rounded-2xl border shadow-xl backdrop-blur-xl overflow-hidden transition-all duration-300"
              style={{
                backgroundColor: 'var(--card-bg, rgba(255, 255, 255, 0.7))',
                borderColor: 'var(--border-main, rgba(148, 163, 184, 0.2))'
              }}
            >
              {/* Header */}
              <div 
                className="px-5 py-3.5 flex items-center justify-between border-b"
                style={{
                  borderColor: 'var(--border-main, rgba(148, 163, 184, 0.15))',
                  background: 'linear-gradient(to right, rgba(42, 157, 143, 0.08), transparent)'
                }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs text-white"
                    style={{ backgroundColor: 'var(--primary, #2A9D8F)' }}
                  >
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-sm tracking-wide uppercase" style={{ color: 'var(--text-main, #0f172a)' }}>
                      Workstation Sections
                    </h2>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted, #64748b)' }}>
                      Pusat dokumentasi & modul operasional departemen
                    </p>
                  </div>
                </div>
                <span 
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border"
                  style={{
                    backgroundColor: 'var(--input-bg, rgba(0,0,0,0.04))',
                    borderColor: 'var(--border-main, rgba(148, 163, 184, 0.2))',
                    color: 'var(--text-muted, #64748b)'
                  }}
                >
                  9 Modul
                </span>
              </div>

              {/* Items List */}
              <div className="p-2 space-y-1">
                {sectionItems.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleNav(item.title)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl transition-all duration-200 group text-left cursor-pointer border border-transparent hover:scale-[1.008] active:scale-[0.995]"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--input-bg, rgba(0, 0, 0, 0.03))';
                        e.currentTarget.style.borderColor = 'var(--border-main, rgba(148, 163, 184, 0.3))';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl ${item.bgClass} ${item.colorClass} flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-xs border ${item.borderClass}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs tracking-tight truncate group-hover:text-[var(--primary)] transition-colors" style={{ color: 'var(--text-main, #0f172a)' }}>
                              {item.title}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${item.badgeBg}`}>
                              {item.badge}
                            </span>
                          </div>
                          <p className="text-[10px] truncate max-w-[240px] sm:max-w-[320px]" style={{ color: 'var(--text-muted, #64748b)' }}>
                            {item.subtitle}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all flex-shrink-0" style={{ color: 'var(--text-muted, #64748b)' }} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* GOLDEN RULES & KEPATUHAN CARD */}
            <div 
              className="rounded-2xl border shadow-xl backdrop-blur-xl overflow-hidden transition-all duration-300"
              style={{
                backgroundColor: 'var(--card-bg, rgba(255, 255, 255, 0.7))',
                borderColor: 'var(--border-main, rgba(148, 163, 184, 0.2))'
              }}
            >
              <div 
                className="px-5 py-3.5 flex items-center justify-between border-b"
                style={{
                  borderColor: 'var(--border-main, rgba(148, 163, 184, 0.15))',
                  background: 'linear-gradient(to right, rgba(233, 147, 13, 0.08), transparent)'
                }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs text-white"
                    style={{ backgroundColor: 'var(--accent, #E9930D)' }}
                  >
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-sm tracking-wide uppercase" style={{ color: 'var(--text-main, #0f172a)' }}>
                      Golden Rules & Kepatuhan
                    </h2>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted, #64748b)' }}>
                      Standar keselamatan kerja & kepatuhan regulasi wajib
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                  Wajib Patuh
                </span>
              </div>

              <div className="p-2 space-y-1">
                {ruleItems.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleNav(`Rules ${item.target}`)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl transition-all duration-200 group text-left cursor-pointer border border-transparent hover:scale-[1.008] active:scale-[0.995]"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--input-bg, rgba(0, 0, 0, 0.03))';
                        e.currentTarget.style.borderColor = 'var(--border-main, rgba(148, 163, 184, 0.3))';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl ${item.bgClass} ${item.colorClass} flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-xs border ${item.borderClass}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs tracking-tight truncate group-hover:text-[var(--accent)] transition-colors" style={{ color: 'var(--text-main, #0f172a)' }}>
                              {item.title}
                            </span>
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                              {item.badge}
                            </span>
                          </div>
                          <p className="text-[10px] truncate max-w-[240px] sm:max-w-[320px]" style={{ color: 'var(--text-muted, #64748b)' }}>
                            {item.subtitle}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all flex-shrink-0" style={{ color: 'var(--text-muted, #64748b)' }} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Weather & Widget Cards */}
          <div className="lg:col-span-7 space-y-6">
            {/* KAWASI WEATHER FROSTED GLASS CARD */}
            <div 
              className="rounded-2xl border shadow-xl backdrop-blur-xl p-5 transition-all duration-300 relative overflow-hidden"
              style={{
                backgroundColor: 'var(--card-bg, rgba(255, 255, 255, 0.7))',
                borderColor: 'var(--border-main, rgba(148, 163, 184, 0.2))'
              }}
            >
              {/* Ambient background glow */}
              <div 
                className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none opacity-20 blur-3xl"
                style={{ background: 'radial-gradient(circle, var(--primary, #2A9D8F), transparent 70%)' }}
              />

              {/* Weather Card Header */}
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs tracking-tight flex items-center gap-1.5" style={{ color: 'var(--text-main, #0f172a)' }}>
                      <span>Kawasi, Pulau Obi</span>
                      <span className="text-[10px] font-normal px-1.5 py-0.2 rounded-full bg-slate-500/10" style={{ color: 'var(--text-muted, #64748b)' }}>
                        Halmahera Selatan
                      </span>
                    </div>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted, #64748b)' }}>
                      Stasiun Cuaca Operasional Tambang & Lab
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>LIVE WIT</span>
                </div>
              </div>

              {/* Current Weather Display */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center mb-5 relative z-10">
                <div className="sm:col-span-6 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400/20 to-indigo-500/10 border border-sky-400/30 flex items-center justify-center shadow-inner">
                    <Cloud className="w-9 h-9 text-sky-400 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="font-display font-black text-4xl tracking-tight" style={{ color: 'var(--text-main, #0f172a)' }}>
                        24°
                      </span>
                      <span className="text-base font-semibold" style={{ color: 'var(--text-muted, #64748b)' }}>C</span>
                    </div>
                    <div className="text-xs font-semibold capitalize" style={{ color: 'var(--text-main, #0f172a)' }}>
                      Overcast Clouds
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted, #64748b)' }}>
                      Terasa seperti 26°C • Siang hari
                    </div>
                  </div>
                </div>

                {/* Weather Metrics */}
                <div className="sm:col-span-6 grid grid-cols-3 gap-2">
                  <div 
                    className="p-2.5 rounded-xl border text-center flex flex-col items-center justify-center"
                    style={{
                      backgroundColor: 'var(--input-bg, rgba(0,0,0,0.02))',
                      borderColor: 'var(--border-main, rgba(148, 163, 184, 0.2))'
                    }}
                  >
                    <Droplets className="w-4 h-4 text-sky-500 mb-1" />
                    <span className="text-[10px]" style={{ color: 'var(--text-muted, #64748b)' }}>Lembab</span>
                    <span className="font-bold text-xs" style={{ color: 'var(--text-main, #0f172a)' }}>78%</span>
                  </div>

                  <div 
                    className="p-2.5 rounded-xl border text-center flex flex-col items-center justify-center"
                    style={{
                      backgroundColor: 'var(--input-bg, rgba(0,0,0,0.02))',
                      borderColor: 'var(--border-main, rgba(148, 163, 184, 0.2))'
                    }}
                  >
                    <Wind className="w-4 h-4 text-teal-500 mb-1" />
                    <span className="text-[10px]" style={{ color: 'var(--text-muted, #64748b)' }}>Angin</span>
                    <span className="font-bold text-xs" style={{ color: 'var(--text-main, #0f172a)' }}>12 km/h</span>
                  </div>

                  <div 
                    className="p-2.5 rounded-xl border text-center flex flex-col items-center justify-center"
                    style={{
                      backgroundColor: 'var(--input-bg, rgba(0,0,0,0.02))',
                      borderColor: 'var(--border-main, rgba(148, 163, 184, 0.2))'
                    }}
                  >
                    <Sun className="w-4 h-4 text-amber-500 mb-1" />
                    <span className="text-[10px]" style={{ color: 'var(--text-muted, #64748b)' }}>Indeks UV</span>
                    <span className="font-bold text-xs" style={{ color: 'var(--text-main, #0f172a)' }}>3 Mod</span>
                  </div>
                </div>
              </div>

              {/* 7-Day Forecast Strip */}
              <div className="relative z-10 pt-3 border-t" style={{ borderColor: 'var(--border-main, rgba(148, 163, 184, 0.15))' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted, #64748b)' }}>
                    Prakiraan 7 Hari Ke Depan
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted, #64748b)' }}>
                    Kondisi Tropis Pesisir
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {['Sab', 'Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum'].map((day, i) => {
                    const isToday = i === 4; // Wednesday
                    return (
                      <div 
                        key={day} 
                        className={`flex flex-col items-center py-2 px-1 rounded-xl border transition-all duration-200 hover:scale-105 cursor-default ${
                          isToday ? 'border-teal-500/50 bg-teal-500/10 shadow-xs' : 'border-transparent hover:border-[var(--border-main)]'
                        }`}
                        style={{
                          backgroundColor: isToday ? undefined : 'var(--input-bg, rgba(0,0,0,0.02))'
                        }}
                      >
                        <span className={`text-[10px] font-bold ${isToday ? 'text-teal-600 dark:text-teal-400 font-extrabold' : ''}`} style={{ color: isToday ? undefined : 'var(--text-main, #0f172a)' }}>
                          {day}
                        </span>
                        <WeatherIcon code={i % 3 === 0 ? 0 : 50} className="w-4 h-4 my-1.5" />
                        <span className="text-[11px] font-bold" style={{ color: 'var(--text-main, #0f172a)' }}>29°</span>
                        <span className="text-[9px] opacity-60" style={{ color: 'var(--text-muted, #64748b)' }}>23°</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* DIGITAL CLOCK CARD */}
              <div 
                className="rounded-2xl border shadow-xl backdrop-blur-xl p-5 flex flex-col justify-between transition-all duration-300"
                style={{
                  backgroundColor: 'var(--card-bg, rgba(255, 255, 255, 0.7))',
                  borderColor: 'var(--border-main, rgba(148, 163, 184, 0.2))'
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-500 flex items-center justify-center">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-xs tracking-tight" style={{ color: 'var(--text-main, #0f172a)' }}>
                        Waktu Operasional Site
                      </span>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted, #64748b)' }}>
                        Stasiun Kawasi (UTC +09:00)
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20">
                    WIT
                  </span>
                </div>

                {/* Digital Digits Display */}
                <div className="my-auto py-2 flex flex-col items-center">
                  <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                    <div 
                      className="px-3 py-2 rounded-xl font-mono text-3xl font-black tracking-tight shadow-md border"
                      style={{
                        backgroundColor: 'var(--input-bg, #0f172a)',
                        borderColor: 'var(--border-main, rgba(148, 163, 184, 0.3))',
                        color: 'var(--text-main, #f8fafc)'
                      }}
                    >
                      {time.getHours().toString().padStart(2, '0')}
                    </div>
                    <span className="text-2xl font-black animate-pulse opacity-70" style={{ color: 'var(--text-muted, #64748b)' }}>:</span>
                    <div 
                      className="px-3 py-2 rounded-xl font-mono text-3xl font-black tracking-tight shadow-md border"
                      style={{
                        backgroundColor: 'var(--input-bg, #0f172a)',
                        borderColor: 'var(--border-main, rgba(148, 163, 184, 0.3))',
                        color: 'var(--text-main, #f8fafc)'
                      }}
                    >
                      {time.getMinutes().toString().padStart(2, '0')}
                    </div>
                    <span className="text-2xl font-black animate-pulse opacity-70" style={{ color: 'var(--text-muted, #64748b)' }}>:</span>
                    <div 
                      className="px-3 py-2 rounded-xl font-mono text-3xl font-black tracking-tight shadow-md border"
                      style={{
                        backgroundColor: 'var(--input-bg, #0f172a)',
                        borderColor: 'var(--border-main, rgba(148, 163, 184, 0.3))',
                        color: 'var(--accent, #E9930D)'
                      }}
                    >
                      {time.getSeconds().toString().padStart(2, '0')}
                    </div>
                  </div>

                  {/* Date Bar */}
                  <div className="mt-4 flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold"
                    style={{
                      backgroundColor: 'var(--input-bg, rgba(0,0,0,0.02))',
                      borderColor: 'var(--border-main, rgba(148, 163, 184, 0.2))',
                      color: 'var(--text-main, #0f172a)'
                    }}
                  >
                    <Calendar className="w-3.5 h-3.5 opacity-70" />
                    <span>
                      {time.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Footer Shift Status */}
                <div className="pt-3 border-t flex items-center justify-between text-[11px]" style={{ borderColor: 'var(--border-main, rgba(148, 163, 184, 0.15))' }}>
                  <span className="flex items-center gap-1.5" style={{ color: 'var(--text-muted, #64748b)' }}>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Shift Operasional:</span>
                  </span>
                  <span className="font-bold font-mono" style={{ color: 'var(--primary, #2A9D8F)' }}>
                    {time.getHours() >= 7 && time.getHours() < 19 ? 'SHIFT 1 (DAY)' : 'SHIFT 2 (NIGHT)'}
                  </span>
                </div>
              </div>

              {/* FOCUS LOFI / AUDIO PLAYER WIDGET */}
              <div 
                className="rounded-2xl border shadow-xl backdrop-blur-xl p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden"
                style={{
                  backgroundColor: 'var(--card-bg, rgba(255, 255, 255, 0.7))',
                  borderColor: 'var(--border-main, rgba(148, 163, 184, 0.2))'
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center">
                      <Music className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-xs tracking-tight" style={{ color: 'var(--text-main, #0f172a)' }}>
                        Lab Focus & Ambient
                      </span>
                      <div className="text-[10px]" style={{ color: 'var(--text-muted, #64748b)' }}>
                        Lofi Beats untuk Konsentrasi Kerja
                      </div>
                    </div>
                  </div>
                  
                  {/* Animated Sound Waveform (bounces when playing) */}
                  <div className="flex items-center gap-0.5 h-4 px-2 py-1 rounded-md bg-slate-500/10">
                    <div className={`w-0.5 bg-teal-500 rounded-full transition-all duration-300 ${isPlaying ? 'h-3 animate-pulse' : 'h-1'}`} />
                    <div className={`w-0.5 bg-teal-500 rounded-full transition-all duration-200 ${isPlaying ? 'h-4 animate-bounce' : 'h-2'}`} />
                    <div className={`w-0.5 bg-teal-500 rounded-full transition-all duration-350 ${isPlaying ? 'h-2.5 animate-pulse' : 'h-1'}`} />
                    <div className={`w-0.5 bg-teal-500 rounded-full transition-all duration-150 ${isPlaying ? 'h-4 animate-bounce' : 'h-1.5'}`} />
                    <div className={`w-0.5 bg-teal-500 rounded-full transition-all duration-300 ${isPlaying ? 'h-3 animate-pulse' : 'h-1'}`} />
                  </div>
                </div>

                {/* Album Cover & Track Details */}
                <div className="flex items-center gap-3.5 mb-3 p-2 rounded-xl border"
                  style={{
                    backgroundColor: 'var(--input-bg, rgba(0,0,0,0.02))',
                    borderColor: 'var(--border-main, rgba(148, 163, 184, 0.2))'
                  }}
                >
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden shadow-md flex-shrink-0 group">
                    <img 
                      src={mediaSettings.lofi || DEFAULT_MEDIA.lofi} 
                      alt="Lofi Widget" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => setActiveSlot({ key: 'lofi', label: 'Widget Canvas Cover' })}
                        className="p-1 rounded-lg bg-black/80 hover:bg-teal-900 text-white text-[9px] border border-teal-500/50 cursor-pointer"
                        title="Ganti cover"
                      >
                        <Camera className="w-3 h-3 text-teal-300" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs truncate" style={{ color: 'var(--text-main, #0f172a)' }}>
                      Kawasi Station Lofi Beats
                    </div>
                    <div className="text-[10px] truncate" style={{ color: 'var(--text-muted, #64748b)' }}>
                      Deep Focus & Analytical Chill
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[9px] font-mono text-teal-600 dark:text-teal-400 font-semibold">
                      <Radio className="w-2.5 h-2.5" />
                      <span>320kbps • High Quality Audio</span>
                    </div>
                  </div>
                </div>

                {/* Player Controls */}
                <div className="space-y-2 pt-1">
                  {/* Progress Bar */}
                  <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-300/30 dark:bg-slate-700/50 relative cursor-pointer group">
                    <div 
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: isPlaying ? '65%' : '35%',
                        backgroundColor: 'var(--primary, #2A9D8F)'
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        style={{ backgroundColor: 'var(--primary, #2A9D8F)' }}
                        title={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                      </button>

                      <button 
                        onClick={() => toast.info('Memuat ulang audio stream...')}
                        className="p-1.5 rounded-lg hover:opacity-80 transition-colors cursor-pointer"
                        style={{ color: 'var(--text-muted, #64748b)' }}
                        title="Restart Stream"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Volume2 className="w-3.5 h-3.5" style={{ color: 'var(--text-muted, #64748b)' }} />
                      <div className="w-16 h-1 rounded-full bg-slate-300/40 dark:bg-slate-700/50 overflow-hidden">
                        <div className="w-3/4 h-full bg-teal-500 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CUSTOMIZE CANVAS / MEDIA                                           */}
      {/* ========================================================================= */}
      {activeSlot && (
        <div 
          className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setActiveSlot(null)}
        >
          <div 
            className="w-full max-w-xl bg-[#1e1e1e] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 bg-[#252525] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-600/30 border border-teal-500/50 text-teal-300 flex items-center justify-center">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm md:text-base">
                    Ganti Foto {activeSlot.label}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Pilih wallpaper preset atau upload foto Anda sendiri
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveSlot(null)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-800 bg-[#212121] px-4 text-xs font-semibold">
              <button
                onClick={() => setCustomizerTab('preset')}
                className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                  customizerTab === 'preset' ? 'border-teal-400 text-teal-300' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Preset Wallpapers</span>
              </button>
              <button
                onClick={() => setCustomizerTab('upload')}
                className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                  customizerTab === 'upload' ? 'border-teal-400 text-teal-300' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Foto Lokal</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
              {customizerTab === 'preset' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {PRESET_WALLPAPERS.map((preset) => {
                    const isSelected = mediaSettings[activeSlot.key] === preset.url;
                    return (
                      <button
                        key={preset.id}
                        disabled={isSaving}
                        onClick={() => handleSaveMedia(activeSlot.key, preset.url)}
                        className={`group relative rounded-xl overflow-hidden aspect-video border text-left transition-all hover:scale-[1.03] active:scale-95 cursor-pointer shadow-md ${
                          isSelected ? 'border-teal-400 ring-2 ring-teal-500/50' : 'border-slate-700/80 hover:border-teal-500/60'
                        }`}
                      >
                        <img 
                          src={preset.thumb} 
                          alt={preset.name} 
                          className="w-full h-full object-cover brightness-90 group-hover:brightness-100" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2">
                          <span className="text-[11px] font-bold text-white leading-tight truncate">{preset.name}</span>
                          <span className="text-[9px] text-teal-300 font-mono">{preset.category}</span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-teal-500 text-slate-900 flex items-center justify-center shadow-md">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Upload Custom Tab */
                <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-700 hover:border-teal-500/60 rounded-2xl bg-[#171717] text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-950/80 border border-teal-700/60 text-teal-400 flex items-center justify-center shadow-md">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-100 text-sm">Pilih file foto dari perangkat Anda</h4>
                    <p className="text-slate-400 text-xs mt-1">Format didukung: JPG, PNG, WebP (otomatis dikompres)</p>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Pilih Foto dari Galeri</span>
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#252525] border-t border-slate-800 flex items-center justify-between">
              <button
                disabled={isSaving}
                onClick={() => handleResetMedia(activeSlot.key)}
                className="text-xs text-slate-400 hover:text-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ResetIcon className="w-3.5 h-3.5" />
                <span>Reset ke Default</span>
              </button>
              
              <button
                onClick={() => setActiveSlot(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
