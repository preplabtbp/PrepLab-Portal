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
  Loader2 
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

const WeatherIcon = ({ code, className }: { code: number, className?: string }) => {
  if (code < 3) return <Sun className={`text-yellow-400 ${className}`} />;
  if (code < 50) return <Cloud className={`text-slate-300 ${className}`} />;
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

  const sections = [
    { title: 'Information' },
    { title: 'Administrasi' },
    { title: 'Laboratorium' },
    { title: 'Preparasi' },
    { title: 'Maintenance' },
    { title: 'Inventory' },
    { title: 'Manajemen Mutu' },
    { title: 'General Issue' },
    { title: 'Prosedur' }
  ];

  const rules = [
    { title: 'Administrasi' },
    { title: 'Laboratorium' },
    { title: 'Manajemen Mutu' },
    { title: 'Preparasi' },
    { title: 'Maintenance' }
  ];

  return (
    <div className="w-full h-full bg-[#1e1e1e] overflow-y-auto text-slate-200">
      {/* 1. Header Banner Canvas */}
      <div className="w-full h-48 md:h-64 lg:h-80 relative overflow-hidden group">
        <img 
          src={mediaSettings.banner || DEFAULT_MEDIA.banner} 
          alt="Banner" 
          className="w-full h-full object-cover object-center brightness-75 transition-all duration-700" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1e1e1e] via-transparent to-black/30" />
        
        {/* Change Banner Button */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setActiveSlot({ key: 'banner', label: 'Header Banner Utama' })}
            className="px-3.5 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-semibold border border-white/20 shadow-lg flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-teal-400" />
            <span>Ganti Banner</span>
          </button>
        </div>
      </div>

      <div className="px-6 md:px-12 py-8 w-full space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-white tracking-wider">PT. TBP & GPS</h1>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            ✨ Homepage Canvas Customizable
          </span>
        </div>

        {/* 2. Gallery Canvas Cards (4 Slots) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {([1, 2, 3, 4] as const).map((num) => {
            const slotKey = `gallery_${num}` as keyof DashboardMediaSettings;
            const imgSrc = mediaSettings[slotKey] || DEFAULT_MEDIA[slotKey];

            return (
              <div 
                key={num} 
                className="aspect-video rounded-xl overflow-hidden shadow-lg border border-slate-700/50 relative group bg-[#161616]"
              >
                <img 
                  src={imgSrc} 
                  alt={`Gallery ${num}`} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
                
                {/* Overlay with Change Photo Button */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
          {/* Left Column: Sections & Rules */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#2a2a2a] rounded-lg overflow-hidden border border-[#333]">
              <div className="bg-[#1e3c2f] px-4 py-2 font-bold text-slate-100 tracking-wider">SECTION</div>
              <div className="flex flex-col">
                {sections.map((item, idx) => (
                  <button key={idx} onClick={() => handleNav(item.title)} className="flex items-center text-sm px-4 py-2 hover:bg-[#333] transition-colors border-b border-[#333] last:border-0 text-left text-slate-300">
                    <span className="mr-2 text-xs opacity-70">📄</span> {item.title.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#2a2a2a] rounded-lg overflow-hidden border border-[#333]">
              <div className="bg-[#1f3044] px-4 py-2 font-bold text-slate-100 tracking-wider">RULES</div>
              <div className="flex flex-col">
                {rules.map((item, idx) => (
                  <button key={idx} onClick={() => handleNav(`Rules ${item.title}`)} className="flex items-center text-sm px-4 py-2 hover:bg-[#333] transition-colors border-b border-[#333] last:border-0 text-left text-slate-300">
                    <span className="mr-2 text-xs opacity-70">▶</span> {item.title.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Weather & Widget Cards */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-transparent text-center pt-2 pb-6">
              <h3 className="text-sm font-semibold tracking-wider mb-6 text-slate-300 uppercase">Kawasi Weather</h3>
              <div className="flex items-center justify-center mb-6">
                <Cloud className="w-8 h-8 text-slate-400 mr-3" />
                <div className="text-left">
                  <div className="text-2xl font-bold">24°C</div>
                  <div className="text-xs text-slate-400">overcast clouds</div>
                </div>
              </div>
              <div className="flex justify-between items-center max-w-sm mx-auto text-sm">
                {['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, i) => (
                  <div key={day} className="flex flex-col items-center">
                    <span className="mb-2 font-medium">{day}</span>
                    <WeatherIcon code={i % 3 === 0 ? 0 : 50} className="w-5 h-5 mb-2" />
                    <span className="text-xs">29°</span>
                    <span className="text-xs text-slate-500">23°</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Digital Clock Card */}
              <div className="bg-white rounded-xl overflow-hidden flex flex-col items-center justify-center p-6 shadow-md">
                <div className="flex items-center gap-1 mb-2">
                  <div className="bg-slate-900 text-white font-mono text-4xl px-3 py-2 rounded-lg font-bold">{time.getHours().toString().padStart(2, '0')}</div>
                  <span className="text-slate-800 text-3xl font-bold">:</span>
                  <div className="bg-slate-900 text-white font-mono text-4xl px-3 py-2 rounded-lg font-bold">{time.getMinutes().toString().padStart(2, '0')}</div>
                  <span className="text-slate-800 text-3xl font-bold">:</span>
                  <div className="bg-slate-900 text-white font-mono text-4xl px-3 py-2 rounded-lg font-bold">{time.getSeconds().toString().padStart(2, '0')}</div>
                </div>
                <div className="text-slate-600 font-semibold tracking-wide text-sm mt-2">
                  {time.toLocaleDateString('en-US', { weekday: 'long' })} | {time.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              </div>

              {/* 3. Lofi / Media Card Canvas */}
              <div className="bg-white rounded-xl p-3 shadow-md">
                <div className="relative rounded-lg overflow-hidden h-32 mb-3 group bg-slate-900">
                  <img 
                    src={mediaSettings.lofi || DEFAULT_MEDIA.lofi} 
                    alt="Lofi Widget" 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute top-2 right-2 w-3 h-3 bg-yellow-400 rounded-full shadow-[0_0_10px_rgba(250,204,21,0.8)]"></div>
                  
                  {/* Change Lofi Image Button */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => setActiveSlot({ key: 'lofi', label: 'Widget Canvas Cover' })}
                      className="px-2.5 py-1 rounded-lg bg-black/80 hover:bg-teal-900 text-white text-[10px] font-bold border border-teal-500/50 flex items-center gap-1 cursor-pointer backdrop-blur-sm"
                    >
                      <Camera className="w-3 h-3 text-teal-300" />
                      <span>Ganti Cover</span>
                    </button>
                  </div>
                </div>

                <div className="text-slate-800 text-xs font-bold mb-2 px-1">
                  {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}<br/>
                  {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="bg-teal-500/20 rounded-full px-4 py-2 flex items-center justify-between mt-1">
                  <button className="text-teal-600 hover:text-teal-800"><Pause className="w-4 h-4 fill-current" /></button>
                  <button className="text-teal-600 hover:text-teal-800"><Play className="w-4 h-4 fill-current" /></button>
                  <button className="text-teal-600 hover:text-teal-800"><RotateCcw className="w-4 h-4" /></button>
                  <div className="w-16 h-1 bg-teal-600/30 rounded-full relative overflow-hidden">
                    <div className="absolute top-0 left-0 h-full w-2/3 bg-teal-600 rounded-full"></div>
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
