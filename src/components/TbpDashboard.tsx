import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  ChevronLeft,
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
  VolumeX,
  Wind,
  Droplets,
  MapPin,
  FolderOpen,
  ExternalLink,
  Calendar,
  CalendarDays,
  CalendarCheck,
  Compass,
  Layers,
  Radio,
  Sliders,
  SkipForward,
  SkipBack,
  CheckCircle2,
  Activity,
  Edit3,
  Eye,
  EyeOff,
  ZoomIn,
  Maximize2
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { ImageModal } from './image-modal';

const WeatherIcon = ({ code, className }: { code: number, className?: string }) => {
  if (code < 3) return <Sun className={`text-amber-400 ${className}`} />;
  if (code < 50) return <Cloud className={`text-sky-300 ${className}`} />;
  return <CloudRain className={`text-blue-400 ${className}`} />;
};

interface TbpDashboardProps {
  posts: any[];
  onSelectPost: (post: any) => void;
  agendaEvents?: any[];
  onOpenFullAgenda?: () => void;
  activeUniverse?: string;
}

interface DashboardMediaSettings {
  banner?: string;
  gallery_1?: string;
  gallery_2?: string;
  gallery_3?: string;
  gallery_4?: string;
  lofi?: string;
  gallery_1_label?: string;
  gallery_2_label?: string;
  gallery_3_label?: string;
  gallery_4_label?: string;
  hide_gallery_labels?: boolean;
}

const DEFAULT_MEDIA: DashboardMediaSettings = {
  banner: '/images/dashboard/prep_lab_banner.jpg',
  gallery_1: '/images/dashboard/gallery_1.jpg',
  gallery_2: '/images/dashboard/gallery_2.jpg',
  gallery_3: '/images/dashboard/gallery_3.jpg',
  gallery_4: '/images/dashboard/gallery_4.jpg',
  lofi: '/images/dashboard/lofi_girl.jpg',
  gallery_1_label: '🔬 Analytical Lab',
  gallery_2_label: '⛏ Mining & Prep',
  gallery_3_label: '⚙ Maintenance Unit',
  gallery_4_label: '📋 QA/QC Center',
  hide_gallery_labels: false
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

export interface FocusStation {
  id: string;
  title: string;
  channel: string;
  category: string;
  videoId: string;
  coverUrl: string;
}

export const FOCUS_STATIONS: FocusStation[] = [
  {
    id: 'lofi-girl',
    title: 'Lofi Girl • 24/7 Beats to Relax/Work',
    channel: 'Lofi Girl Live',
    category: 'Lofi Hip Hop',
    videoId: 'jfKfPfyJRdk',
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'synthwave-chill',
    title: 'Synthwave Chill • Retro Beats',
    channel: 'Lofi Girl Synthwave',
    category: 'Synthwave',
    videoId: '4xDzrJKXOOY',
    coverUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'deep-focus-ambient',
    title: 'Deep Focus • 432Hz Alpha Waves',
    channel: 'Lab Focus Audio',
    category: 'Binaural Focus',
    videoId: 'WPni755-Krg',
    coverUrl: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'rain-nature',
    title: 'Rain & Thunderstorm • Tropical Ambience',
    channel: 'Nature Atmosphere',
    category: 'Natural Sound',
    videoId: 'mPZkdNFkNps',
    coverUrl: 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?auto=format&fit=crop&w=300&q=80'
  },
  {
    id: 'classical-piano',
    title: 'Peaceful Piano • Concentration Study',
    channel: 'Acoustic Lab',
    category: 'Classical Piano',
    videoId: 'jgpJVI3tDbY',
    coverUrl: 'https://images.unsplash.com/photo-1520523839898-5071282543e9?auto=format&fit=crop&w=300&q=80'
  }
];

export function TbpDashboard({ 
  posts, 
  onSelectPost, 
  agendaEvents = [], 
  onOpenFullAgenda, 
  activeUniverse 
}: TbpDashboardProps) {
  const [time, setTime] = useState(new Date());

  // =========================================================================
  // MINI CALENDAR & MAJOR AGENDAS STATE & HELPERS
  // =========================================================================
  const [currentCalDate, setCurrentCalDate] = useState(() => new Date());
  const [selectedCalDateStr, setSelectedCalDateStr] = useState<string | null>(null);

  const prevCalMonth = () => {
    setCurrentCalDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const nextCalMonth = () => {
    setCurrentCalDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };
  const resetCalToToday = () => {
    setCurrentCalDate(new Date());
    setSelectedCalDateStr(null);
  };

  const formatDateToIsoKey = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Map of dates (YYYY-MM-DD) that have major events/agendas
  const datesWithEvents = useMemo(() => {
    const dateMap = new Map<string, number>();
    (agendaEvents || []).forEach(evt => {
      if (
        evt.isBirthday ||
        evt.kategori === 'Quality Assurance' ||
        evt.title?.includes('🎂') ||
        evt.title?.toLowerCase().includes('ulang tahun') ||
        (evt.id && String(evt.id).startsWith('bday-'))
      ) {
        return;
      }
      const rawDate = evt.startDate || evt.start;
      if (!rawDate) return;
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        const key = formatDateToIsoKey(d);
        dateMap.set(key, (dateMap.get(key) || 0) + 1);
      }
    });
    return dateMap;
  }, [agendaEvents]);

  // Calendar cells for currently viewed month
  const calendarGrid = useMemo(() => {
    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth();

    const firstDay = new Date(year, month, 1);
    let startDay = firstDay.getDay() - 1; // 0=Mon, 6=Sun
    if (startDay < 0) startDay = 6;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: Array<{
      dayNum: number;
      dateKey: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      hasEvents: boolean;
      eventCount: number;
    }> = [];

    const todayKey = formatDateToIsoKey(new Date());

    // 1. Previous month trailing days
    for (let i = startDay - 1; i >= 0; i--) {
      const dNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dNum);
      const dKey = formatDateToIsoKey(prevDate);
      cells.push({
        dayNum: dNum,
        dateKey: dKey,
        isCurrentMonth: false,
        isToday: dKey === todayKey,
        hasEvents: datesWithEvents.has(dKey),
        eventCount: datesWithEvents.get(dKey) || 0,
      });
    }

    // 2. Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const curDate = new Date(year, month, d);
      const dKey = formatDateToIsoKey(curDate);
      cells.push({
        dayNum: d,
        dateKey: dKey,
        isCurrentMonth: true,
        isToday: dKey === todayKey,
        hasEvents: datesWithEvents.has(dKey),
        eventCount: datesWithEvents.get(dKey) || 0,
      });
    }

    // 3. Next month leading days to complete full 7-day rows
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      const dKey = formatDateToIsoKey(nextDate);
      cells.push({
        dayNum: d,
        dateKey: dKey,
        isCurrentMonth: false,
        isToday: dKey === todayKey,
        hasEvents: datesWithEvents.has(dKey),
        eventCount: datesWithEvents.get(dKey) || 0,
      });
    }

    return cells;
  }, [currentCalDate, datesWithEvents]);

  // Major agendas list (upcoming or filtered by selected date)
  const majorAgendasList = useMemo(() => {
    if (!agendaEvents || agendaEvents.length === 0) return [];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // Base filter: non-birthday, valid dates
    let list = agendaEvents.filter(evt => {
      if (
        evt.isBirthday ||
        evt.kategori === 'Quality Assurance' ||
        evt.title?.includes('🎂') ||
        evt.title?.toLowerCase().includes('ulang tahun') ||
        (evt.id && String(evt.id).startsWith('bday-'))
      ) {
        return false;
      }
      return Boolean(evt.startDate || evt.start);
    });

    // Universe filter if event has explicit pt
    if (activeUniverse && activeUniverse !== 'ALL') {
      list = list.filter(evt => {
        if (!evt.pt) return true;
        return (evt.pt === 'GTS' ? 'GTS' : 'TBP') === activeUniverse;
      });
    }

    // If a specific date is selected in the mini calendar, filter to that date
    if (selectedCalDateStr) {
      return list.filter(evt => {
        const d = new Date(evt.startDate || evt.start);
        return !isNaN(d.getTime()) && formatDateToIsoKey(d) === selectedCalDateStr;
      }).sort((a, b) => new Date(a.startDate || a.start).getTime() - new Date(b.startDate || b.start).getTime());
    }

    // Otherwise, show upcoming major agendas (today and forward)
    return list
      .filter(evt => {
        const d = new Date(evt.startDate || evt.start).getTime();
        return !isNaN(d) && d >= startOfToday;
      })
      .sort((a, b) => new Date(a.startDate || a.start).getTime() - new Date(b.startDate || b.start).getTime())
      .slice(0, 5);
  }, [agendaEvents, selectedCalDateStr, activeUniverse]);

  const getRelativeStatus = (dInput: string | Date) => {
    const d = new Date(dInput);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return { 
        text: 'HARI INI', 
        badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-extrabold',
      };
    } else if (diffDays === 1) {
      return { 
        text: 'BESOK', 
        badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold',
      };
    } else if (diffDays === 2) {
      return { 
        text: 'LUSA', 
        badgeClass: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30 font-bold',
      };
    } else if (diffDays > 2 && diffDays <= 7) {
      return { 
        text: `${diffDays} hari lagi`, 
        badgeClass: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30 font-semibold',
      };
    } else if (diffDays > 7) {
      return { 
        text: `${diffDays} hari lagi`, 
        badgeClass: 'bg-slate-500/10 text-slate-500 border-slate-500/20 font-medium',
      };
    } else {
      return { 
        text: 'Selesai', 
        badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20 font-medium',
      };
    }
  };

  const getCategoryBadge = (kat?: string) => {
    const k = (kat || '').toLowerCase();
    if (k.includes('meeting') || k.includes('rapat')) return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
    if (k.includes('audit') || k.includes('k3') || k.includes('safety')) return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    if (k.includes('kalibrasi') || k.includes('maintenance')) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    if (k.includes('training') || k.includes('pelatihan')) return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20';
  };
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
  const [tempLabel, setTempLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openSlotCustomizer = (slot: { key: keyof DashboardMediaSettings; label: string }) => {
    setActiveSlot(slot);
    const labelKey = `${slot.key}_label` as keyof DashboardMediaSettings;
    const currentLbl = mediaSettings[labelKey];
    setTempLabel(currentLbl !== undefined ? String(currentLbl) : (DEFAULT_MEDIA[labelKey] ? String(DEFAULT_MEDIA[labelKey]) : ''));
  };

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

  // Realtime Weather for Kawasi, Pulau Obi (Halmahera Selatan - WIT UTC+9)
  const [weatherData, setWeatherData] = useState<{
    temp: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    uvIndex: number;
    conditionText: string;
    weatherCode: number;
    dailyForecast: Array<{ day: string; code: number; maxTemp: number; minTemp: number }>;
  } | null>(null);

  useEffect(() => {
    const fetchKawasiWeather = async () => {
      try {
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=-1.57&longitude=127.48&current_weather=true&hourly=relative_humidity_2m,apparent_temperature,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FJayapura'
        );
        const data = await res.json();
        if (data && data.current_weather) {
          const currentHour = new Date().getHours();
          const humidity = data.hourly?.relative_humidity_2m?.[currentHour] ?? 78;
          const feelsLike = Math.round(data.hourly?.apparent_temperature?.[currentHour] ?? data.current_weather.temperature);
          const uvIndex = Math.round(data.hourly?.uv_index?.[currentHour] ?? 3);
          const code = data.current_weather.weathercode ?? 1;

          const getConditionDesc = (c: number) => {
            if (c === 0) return 'Cerah / Clear Sky';
            if (c === 1 || c === 2) return 'Cerah Berawan';
            if (c === 3) return 'Berawan / Overcast';
            if (c === 45 || c === 48) return 'Berkabut / Hazy';
            if (c >= 51 && c <= 55) return 'Gerimis Ringan';
            if (c >= 61 && c <= 65) return 'Hujan Tropis';
            if (c >= 80 && c <= 82) return 'Hujan Lebat';
            if (c >= 95) return 'Hujan Petir';
            return 'Berawan';
          };

          const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
          const daily = (data.daily?.time || []).slice(0, 7).map((tStr: string, idx: number) => {
            const d = new Date(tStr);
            return {
              day: dayNames[d.getDay()],
              code: data.daily?.weather_code?.[idx] ?? 1,
              maxTemp: Math.round(data.daily?.temperature_2m_max?.[idx] ?? 30),
              minTemp: Math.round(data.daily?.temperature_2m_min?.[idx] ?? 23)
            };
          });

          setWeatherData({
            temp: Math.round(data.current_weather.temperature),
            feelsLike,
            humidity,
            windSpeed: Math.round(data.current_weather.windspeed),
            uvIndex,
            conditionText: getConditionDesc(code),
            weatherCode: code,
            dailyForecast: daily
          });
        }
      } catch (err) {
        console.warn('Failed to fetch real-time Kawasi weather:', err);
      }
    };

    fetchKawasiWeather();
    const interval = setInterval(fetchKawasiWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleNav = (title: string) => {
    const searchStr = (title || '').toLowerCase().trim();
    
    // 1. Exact match (cleaned of markdown formatting)
    let post = posts.find(p => {
      const clean = (p?.title || '').replace(/^[#\s\-*]+/, '').trim().toLowerCase();
      return clean === searchStr;
    });
    
    // 2. Exact match with "Information " or "Section " prefix
    if (!post) {
      post = posts.find(p => {
        const clean = (p?.title || '').replace(/^[#\s\-*]+/, '').trim().toLowerCase();
        return clean === `information ${searchStr}` || clean === `section ${searchStr}`;
      });
    }

    // 3. Synonym mapping (e.g. Inventory -> Warehouse, General Issue -> Non Routine General Issue)
    if (!post) {
      if (searchStr === 'inventory' || searchStr === 'warehouse') {
        post = posts.find(p => {
          const clean = (p?.title || '').replace(/^[#\s\-*]+/, '').trim().toLowerCase();
          return clean === 'warehouse' || clean === 'information warehouse' || clean === 'warehouse / inventory control' || clean.includes('warehouse') || clean.includes('inventory');
        });
      } else if (searchStr === 'general issue' || searchStr === 'general issues') {
        post = posts.find(p => {
          const clean = (p?.title || '').replace(/^[#\s\-*]+/, '').trim().toLowerCase();
          return clean === 'general issue' || clean.includes('general issue');
        });
      }
    }

    // 4. Category / Section exact match
    if (!post) {
      post = posts.find(p => {
        const cat = (p?.category || p?.section || '').toLowerCase().trim();
        const clean = (p?.title || '').replace(/^[#\s\-*]+/, '').trim().toLowerCase();
        return cat === searchStr && !clean.includes('identifikasi') && !clean.includes('pengecekan');
      });
    }

    // 5. Fallback starting with searchStr (avoiding random substring matches)
    if (!post) {
      post = posts.find(p => {
        const clean = (p?.title || '').replace(/^[#\s\-*]+/, '').trim().toLowerCase();
        return clean.startsWith(searchStr) || clean.includes(searchStr);
      });
    }

    if (post) {
      onSelectPost(post);
    } else {
      // Seamlessly open Section Hub dashboard for this section
      const normalizedTitle = title.trim();
      const syntheticSectionPost = {
        id: `section-${normalizedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        title: normalizedTitle,
        department: 'Prep & Lab',
        category: normalizedTitle.toUpperCase(),
        content: `# ${normalizedTitle}\n\n$INFO$\n\n$RULES$`,
        pt: activeUniverse === 'GTS' ? 'GTS' : 'TBP'
      };
      onSelectPost(syntheticSectionPost);
    }
  };

  // General save settings to state, localStorage & backend
  const handleSaveSettings = async (newPartial: Partial<DashboardMediaSettings>, successMsg = 'Pengaturan berhasil disimpan!') => {
    setIsSaving(true);
    try {
      const updated = { ...mediaSettings, ...newPartial };
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

      toast.success(successMsg);
    } catch (e) {
      toast.error('Gagal menyimpan perubahan');
    } finally {
      setIsSaving(false);
    }
  };

  // Save new media URL
  const handleSaveMedia = async (slotKey: keyof DashboardMediaSettings, url: string) => {
    await handleSaveSettings({ [slotKey]: url }, 'Foto canvas berhasil diperbarui!');
    setActiveSlot(null);
  };

  // Reset slot to default
  const handleResetMedia = async (slotKey: keyof DashboardMediaSettings) => {
    const defaultUrl = DEFAULT_MEDIA[slotKey];
    if (typeof defaultUrl === 'string') {
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

  // Lab Focus & Ambient (YouTube Audio Stream Engine)
  const [stationIndex, setStationIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [showStationPicker, setShowStationPicker] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const ytIframeRef = useRef<HTMLIFrameElement>(null);

  const currentStation = FOCUS_STATIONS[stationIndex] || FOCUS_STATIONS[0];

  const sendYtCommand = (func: string, args: any = '') => {
    if (ytIframeRef.current && ytIframeRef.current.contentWindow) {
      ytIframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        '*'
      );
    }
  };

  const togglePlayAudio = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      sendYtCommand('playVideo');
      toast.success(`Memutar: ${currentStation.title}`, { id: 'ambient-player' });
    } else {
      setIsPlaying(false);
      sendYtCommand('pauseVideo');
      toast.info('Audio focus dijeda', { id: 'ambient-player' });
    }
  };

  const changeStation = (newIdx: number) => {
    const safeIdx = (newIdx + FOCUS_STATIONS.length) % FOCUS_STATIONS.length;
    setStationIndex(safeIdx);
    setIsPlaying(true);
    toast.success(`Beralih ke: ${FOCUS_STATIONS[safeIdx].title}`, { id: 'ambient-player' });
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (isMuted && newVol > 0) setIsMuted(false);
    sendYtCommand('setVolume', [newVol]);
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      sendYtCommand('unMute');
      sendYtCommand('setVolume', [volume || 80]);
    } else {
      setIsMuted(true);
      sendYtCommand('mute');
    }
  };

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

        {/* Banner Action Buttons */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 z-20">
          <button
            onClick={() => setPreviewImage({ 
              url: mediaSettings.banner || DEFAULT_MEDIA.banner, 
              title: 'Header Banner Utama • Prep & Analytical Lab Portal (Site Kawasi • Pulau Obi)' 
            })}
            className="px-3.5 py-1.5 rounded-xl bg-black/70 hover:bg-black/90 backdrop-blur-md text-white text-xs font-semibold border border-white/30 shadow-lg flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5 text-teal-400" />
            <span>Lihat Banner</span>
          </button>

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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const nextHidden = !mediaSettings.hide_gallery_labels;
                  handleSaveSettings(
                    { hide_gallery_labels: nextHidden },
                    nextHidden ? 'Deskripsi foto disembunyikan!' : 'Deskripsi foto ditampilkan!'
                  );
                }}
                className="px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer hover:bg-slate-700/30 transition-all active:scale-95"
                style={{
                  backgroundColor: 'var(--card-bg, rgba(255, 255, 255, 0.6))',
                  borderColor: 'var(--border-main, rgba(148, 163, 184, 0.2))',
                  color: mediaSettings.hide_gallery_labels ? 'var(--text-muted, #94a3b8)' : 'var(--primary, #2A9D8F)'
                }}
                title={mediaSettings.hide_gallery_labels ? "Tampilkan Deskripsi Foto" : "Hilangkan Deskripsi Foto"}
              >
                {mediaSettings.hide_gallery_labels ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-rose-400" />
                    <span>Deskripsi Tersembunyi</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-teal-400" />
                    <span>Deskripsi Aktif</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 2. Gallery Canvas Cards (4 Slots) with Fullscreen Preview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {([1, 2, 3, 4] as const).map((num) => {
            const slotKey = `gallery_${num}` as keyof DashboardMediaSettings;
            const imgSrc = String(mediaSettings[slotKey] || DEFAULT_MEDIA[slotKey] || '');
            const labelKey = `gallery_${num}_label` as keyof DashboardMediaSettings;
            const customLabel = mediaSettings[labelKey];
            const currentLabel = customLabel !== undefined ? String(customLabel) : String(DEFAULT_MEDIA[labelKey] || '');
            const showLabel = !mediaSettings.hide_gallery_labels && currentLabel.trim().length > 0;

            return (
              <div 
                key={num} 
                onClick={() => setPreviewImage({ url: imgSrc, title: currentLabel || `Gallery Foto #${num}` })}
                className="aspect-video rounded-2xl overflow-hidden shadow-lg border relative group transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] cursor-pointer"
                style={{
                  backgroundColor: 'var(--card-bg, #161616)',
                  borderColor: 'var(--border-main, rgba(51, 65, 85, 0.5))'
                }}
              >
                <img 
                  src={imgSrc} 
                  alt={currentLabel || `Gallery ${num}`} 
                  className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700" 
                />
                
                {/* Subtle dark gradient overlay at bottom if label is shown */}
                {showLabel && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
                )}

                {/* Bottom label (conditional) */}
                {showLabel && (
                  <div className="absolute bottom-2.5 left-2.5 pointer-events-none max-w-[85%] z-10">
                    <span className="px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-md text-white/90 text-[10px] font-semibold border border-white/20 shadow-md truncate block">
                      {currentLabel}
                    </span>
                  </div>
                )}

                {/* Top-right Quick Zoom indicator */}
                <div className="absolute top-2.5 right-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-md">
                    <ZoomIn className="w-3.5 h-3.5 text-teal-300" />
                  </div>
                </div>

                {/* Overlay with Preview and Change Photo Buttons */}
                <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 gap-2 z-20">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewImage({ url: imgSrc, title: currentLabel || `Gallery Foto #${num}` });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-black text-white text-[11px] font-bold border border-white/30 shadow-xl flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-sm"
                  >
                    <ZoomIn className="w-3 h-3 text-teal-400" />
                    <span>Lihat Layar Penuh</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openSlotCustomizer({ key: slotKey, label: `Gallery Canvas #${num}` });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold border border-teal-400/50 shadow-xl flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-sm"
                  >
                    <Camera className="w-3 h-3 text-white" />
                    <span>Ganti Foto / Teks</span>
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
                    className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xs text-white shrink-0"
                    style={{ backgroundColor: 'var(--primary, #2A9D8F)' }}
                  >
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-sm sm:text-base tracking-wide uppercase" style={{ color: 'var(--text-main, #0f172a)' }}>
                      Workstation Sections
                    </h2>
                    <p className="text-xs text-[var(--text-muted)]" style={{ color: 'var(--text-muted, #64748b)' }}>
                      Pusat dokumentasi & modul operasional departemen
                    </p>
                  </div>
                </div>
                <span 
                  className="px-2.5 py-1 rounded-full text-xs font-bold tracking-wider uppercase border"
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
                      className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl transition-all duration-200 group text-left cursor-pointer border border-transparent hover:scale-[1.008] active:scale-[0.995]"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--input-bg, rgba(0, 0, 0, 0.03))';
                        e.currentTarget.style.borderColor = 'var(--border-main, rgba(148, 163, 184, 0.3))';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`w-10 h-10 rounded-xl ${item.bgClass} ${item.colorClass} flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-xs border ${item.borderClass}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-sm sm:text-base tracking-tight truncate group-hover:text-[var(--primary)] transition-colors" style={{ color: 'var(--text-main, #0f172a)' }}>
                          {item.title}
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all flex-shrink-0 ml-2" style={{ color: 'var(--text-muted, #64748b)' }} />
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
                    className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xs text-white shrink-0"
                    style={{ backgroundColor: 'var(--accent, #E9930D)' }}
                  >
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-sm sm:text-base tracking-wide uppercase" style={{ color: 'var(--text-main, #0f172a)' }}>
                      Golden Rules & Kepatuhan
                    </h2>
                    <p className="text-xs text-[var(--text-muted)]" style={{ color: 'var(--text-muted, #64748b)' }}>
                      Standar keselamatan kerja & kepatuhan regulasi wajib
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-extrabold tracking-wider uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1.5">
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
                      className="w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl transition-all duration-200 group text-left cursor-pointer border border-transparent hover:scale-[1.008] active:scale-[0.995]"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--input-bg, rgba(0, 0, 0, 0.03))';
                        e.currentTarget.style.borderColor = 'var(--border-main, rgba(148, 163, 184, 0.3))';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`w-10 h-10 rounded-xl ${item.bgClass} ${item.colorClass} flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 shadow-xs border ${item.borderClass}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm tracking-tight truncate group-hover:text-[var(--accent)] transition-colors" style={{ color: 'var(--text-main, #0f172a)' }}>
                              {item.title}
                            </span>
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                              {item.badge}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-[var(--text-muted)] truncate max-w-[280px] sm:max-w-md mt-0.5" style={{ color: 'var(--text-muted, #64748b)' }}>
                            {item.subtitle}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all flex-shrink-0 ml-2" style={{ color: 'var(--text-muted, #64748b)' }} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Weather & Widget Cards */}
          <div className="lg:col-span-7 space-y-6">
            {/* ========================================================================= */}
            {/* KALENDER AGENDA DEPARTEMEN CARD                                           */}
            {/* ========================================================================= */}
            <div 
              className="rounded-2xl border shadow-xl backdrop-blur-xl p-5 transition-all duration-300 relative overflow-hidden"
              style={{
                backgroundColor: 'var(--card-bg, rgba(255, 255, 255, 0.7))',
                borderColor: 'var(--border-main, rgba(148, 163, 184, 0.2))'
              }}
            >
              {/* Ambient Glow */}
              <div 
                className="absolute -top-12 -right-12 w-56 h-56 rounded-full pointer-events-none opacity-20 blur-3xl"
                style={{ background: 'radial-gradient(circle, var(--primary, #2A9D8F), transparent 70%)' }}
              />

              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5 relative z-10 border-b pb-4" style={{ borderColor: 'var(--border-main, rgba(148, 163, 184, 0.15))' }}>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center shadow-xs text-white"
                    style={{ backgroundColor: 'var(--primary, #2A9D8F)' }}
                  >
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display font-bold text-sm sm:text-base tracking-wide uppercase" style={{ color: 'var(--text-main, #0f172a)' }}>
                        Kalender &amp; Agenda Departemen
                      </h2>
                      <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold border border-teal-500/20">
                        {datesWithEvents.size} Hari Terjadwal
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]" style={{ color: 'var(--text-muted, #64748b)' }}>
                      Informasi jadwal inspeksi, meeting koordinasi, audit, &amp; operasional terdekat
                    </p>
                  </div>
                </div>

                {onOpenFullAgenda && (
                  <button
                    onClick={onOpenFullAgenda}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
                    title="Buka Kalender Agenda Lengkap"
                  >
                    <span>Kalender Lengkap</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* 2-Column Responsive Layout: Mini Calendar (Left) + Major Agendas List (Right) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
                {/* Mini Calendar Column */}
                <div className="md:col-span-5 flex flex-col justify-between p-3.5 rounded-xl border"
                  style={{
                    backgroundColor: 'var(--input-bg, rgba(0, 0, 0, 0.02))',
                    borderColor: 'var(--border-main, rgba(148, 163, 184, 0.2))'
                  }}
                >
                  {/* Calendar Month Navigation Header */}
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={prevCalMonth}
                      className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
                      title="Bulan Sebelumnya"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs capitalize" style={{ color: 'var(--text-main, #0f172a)' }}>
                        {currentCalDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        onClick={resetCalToToday}
                        className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer ml-1"
                        title="Kembali ke Hari Ini"
                      >
                        Hari Ini
                      </button>
                    </div>

                    <button
                      onClick={nextCalMonth}
                      className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
                      title="Bulan Berikutnya"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Days of Week Header */}
                  <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                    {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((dayName, idx) => (
                      <span key={idx} className="text-xs font-bold uppercase tracking-wider opacity-60" style={{ color: 'var(--text-muted, #64748b)' }}>
                        {dayName}
                      </span>
                    ))}
                  </div>

                  {/* Calendar Cells Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarGrid.map((cell, idx) => {
                      const isSelected = selectedCalDateStr === cell.dateKey;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedCalDateStr(null);
                            } else {
                              setSelectedCalDateStr(cell.dateKey);
                            }
                          }}
                          className={`h-8 rounded-lg flex flex-col items-center justify-center relative transition-all duration-150 cursor-pointer ${
                            isSelected
                              ? 'bg-teal-600 text-white font-black shadow-md scale-105 ring-2 ring-teal-400/50'
                              : cell.isToday
                              ? 'bg-teal-500/15 border border-teal-500/50 font-bold text-teal-600 dark:text-teal-400'
                              : cell.isCurrentMonth
                              ? 'hover:bg-slate-200/70 dark:hover:bg-slate-800/70 text-slate-800 dark:text-slate-200 font-medium'
                              : 'opacity-25 hover:opacity-50 text-slate-400'
                          }`}
                          title={`${cell.dateKey} ${cell.hasEvents ? `(${cell.eventCount} agenda)` : ''}`}
                        >
                          <span className="text-xs leading-none font-semibold">{cell.dayNum}</span>
                          {cell.hasEvents && (
                            <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-amber-300' : 'bg-teal-500'}`} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Calendar Legend */}
                  <div className="mt-3 pt-2 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--border-main, rgba(148, 163, 184, 0.15))', color: 'var(--text-muted, #64748b)' }}>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                      <span>Ada Agenda</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded border border-teal-500/50 bg-teal-500/10"></span>
                      <span>Hari Ini</span>
                    </div>
                  </div>
                </div>

                {/* Major Agendas Column */}
                <div className="md:col-span-7 flex flex-col justify-between space-y-3">
                  {/* Filter Subheader */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs uppercase tracking-wide" style={{ color: 'var(--text-main, #0f172a)' }}>
                        {selectedCalDateStr ? (
                          <>Agenda: <span className="text-teal-600 dark:text-teal-400">{new Date(selectedCalDateStr + 'T00:00:00').toLocaleDateString('id-ID', { dateStyle: 'medium' })}</span></>
                        ) : (
                          "Agenda Departemen Terdekat"
                        )}
                      </span>
                      {selectedCalDateStr && (
                        <button
                          onClick={() => setSelectedCalDateStr(null)}
                          className="text-xs text-teal-600 dark:text-teal-400 hover:underline cursor-pointer font-medium"
                        >
                          (Tampilkan Semua)
                        </button>
                      )}
                    </div>
                    <span className="text-xs px-2.5 py-0.5 rounded-md font-mono font-bold" style={{ backgroundColor: 'var(--input-bg, rgba(0,0,0,0.04))', color: 'var(--text-muted, #64748b)' }}>
                      {majorAgendasList.length} Kegiatan
                    </span>
                  </div>

                  {/* Agendas List */}
                  <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1 custom-scrollbar">
                    {majorAgendasList.length === 0 ? (
                      <div className="p-6 rounded-xl border text-center flex flex-col items-center justify-center space-y-2"
                        style={{
                          backgroundColor: 'var(--input-bg, rgba(0, 0, 0, 0.01))',
                          borderColor: 'var(--border-main, rgba(148, 163, 184, 0.2))'
                        }}
                      >
                        <CalendarCheck className="w-8 h-8 text-teal-500/40" />
                        <div className="text-sm font-semibold" style={{ color: 'var(--text-main, #0f172a)' }}>
                          {selectedCalDateStr ? 'Tidak ada agenda di tanggal terpilih' : 'Tidak ada agenda departemen terdekat'}
                        </div>
                        <p className="text-xs max-w-sm" style={{ color: 'var(--text-muted, #64748b)' }}>
                          {selectedCalDateStr ? 'Silakan pilih tanggal lain yang memiliki dot hijau atau lihat agenda mendatang.' : 'Semua kegiatan telah selesai atau belum ada jadwal baru yang ditambahkan.'}
                        </p>
                        {onOpenFullAgenda && (
                          <button
                            onClick={onOpenFullAgenda}
                            className="mt-1 text-xs text-teal-600 dark:text-teal-400 hover:underline font-bold cursor-pointer"
                          >
                            + Tambah atau Periksa Agenda
                          </button>
                        )}
                      </div>
                    ) : (
                      majorAgendasList.map((agenda, aIdx) => {
                        const rel = getRelativeStatus(agenda.startDate || agenda.start);
                        const catClass = getCategoryBadge(agenda.kategori);
                        const evtDate = new Date(agenda.startDate || agenda.start);
                        
                        return (
                          <div
                            key={agenda.id || aIdx}
                            onClick={onOpenFullAgenda}
                            className="p-3 rounded-xl border transition-all duration-200 hover:scale-[1.01] hover:shadow-md cursor-pointer group"
                            style={{
                              backgroundColor: 'var(--input-bg, rgba(0, 0, 0, 0.02))',
                              borderColor: 'var(--border-main, rgba(148, 163, 184, 0.2))'
                            }}
                            title="Klik untuk membuka di kalender lengkap"
                          >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${rel.badgeClass}`}>
                                    {rel.text}
                                  </span>
                                  {agenda.kategori && (
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${catClass}`}>
                                      {agenda.kategori}
                                    </span>
                                  )}
                                </div>
                                <h3 className="font-bold text-xs sm:text-sm tracking-tight group-hover:text-[var(--primary)] transition-colors line-clamp-1" style={{ color: 'var(--text-main, #0f172a)' }}>
                                  {agenda.title}
                                </h3>
                              </div>
                              <ExternalLink className="w-3.5 h-3.5 opacity-30 group-hover:opacity-100 group-hover:text-teal-500 transition-opacity flex-shrink-0 mt-1" />
                            </div>

                            <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: 'var(--text-muted, #64748b)' }}>
                              <div className="flex items-center gap-1 font-medium">
                                <Clock className="w-3.5 h-3.5 text-teal-500/80" />
                                <span>
                                  {evtDate.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                                  {' • '}
                                  {evtDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIT
                                </span>
                              </div>
                              {agenda.pic && (
                                <div className="flex items-center gap-1">
                                  <span className="opacity-60">PIC:</span>
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">{agenda.pic}</span>
                                </div>
                              )}
                              {agenda.lokasi && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-sky-500" />
                                  <span className="truncate max-w-[140px]">{agenda.lokasi}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

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
                    <div className="font-bold text-xs sm:text-sm tracking-tight flex items-center gap-1.5" style={{ color: 'var(--text-main, #0f172a)' }}>
                      <span>Kawasi, Pulau Obi</span>
                      <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-slate-500/10" style={{ color: 'var(--text-muted, #64748b)' }}>
                        Halmahera Selatan
                      </span>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      Stasiun Cuaca Operasional Tambang & Lab
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>LIVE WIT</span>
                </div>
              </div>

              {/* Current Weather Display */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center mb-5 relative z-10">
                <div className="sm:col-span-6 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400/20 to-indigo-500/10 border border-sky-400/30 flex items-center justify-center shadow-inner">
                    <WeatherIcon code={weatherData ? weatherData.weatherCode : 1} className="w-9 h-9 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="font-display font-black text-4xl tracking-tight" style={{ color: 'var(--text-main, #0f172a)' }}>
                        {weatherData ? `${weatherData.temp}°` : '27°'}
                      </span>
                      <span className="text-base font-semibold" style={{ color: 'var(--text-muted, #64748b)' }}>C</span>
                    </div>
                    <div className="text-xs sm:text-sm font-semibold capitalize" style={{ color: 'var(--text-main, #0f172a)' }}>
                      {weatherData ? weatherData.conditionText : 'Cerah Berawan'}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {weatherData ? `Terasa seperti ${weatherData.feelsLike}°C • Halmahera Selatan` : 'Stasiun Cuaca Pulau Obi • WIT'}
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
                    <span className="text-xs text-[var(--text-muted)]">Lembab</span>
                    <span className="font-bold text-xs sm:text-sm" style={{ color: 'var(--text-main, #0f172a)' }}>
                      {weatherData ? `${weatherData.humidity}%` : '78%'}
                    </span>
                  </div>

                  <div 
                    className="p-2.5 rounded-xl border text-center flex flex-col items-center justify-center"
                    style={{
                      backgroundColor: 'var(--input-bg, rgba(0,0,0,0.02))',
                      borderColor: 'var(--border-main, rgba(148, 163, 184, 0.2))'
                    }}
                  >
                    <Wind className="w-4 h-4 text-teal-500 mb-1" />
                    <span className="text-xs text-[var(--text-muted)]">Angin</span>
                    <span className="font-bold text-xs sm:text-sm" style={{ color: 'var(--text-main, #0f172a)' }}>
                      {weatherData ? `${weatherData.windSpeed} km/h` : '5 km/h'}
                    </span>
                  </div>

                  <div 
                    className="p-2.5 rounded-xl border text-center flex flex-col items-center justify-center"
                    style={{
                      backgroundColor: 'var(--input-bg, rgba(0,0,0,0.02))',
                      borderColor: 'var(--border-main, rgba(148, 163, 184, 0.2))'
                    }}
                  >
                    <Sun className="w-4 h-4 text-amber-500 mb-1" />
                    <span className="text-xs text-[var(--text-muted)]">Indeks UV</span>
                    <span className="font-bold text-xs sm:text-sm" style={{ color: 'var(--text-main, #0f172a)' }}>
                      {weatherData ? `${weatherData.uvIndex} Mod` : '3 Mod'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 7-Day Forecast Strip */}
              <div className="relative z-10 pt-3 border-t" style={{ borderColor: 'var(--border-main, rgba(148, 163, 184, 0.15))' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Prakiraan 7 Hari Ke Depan
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    Kondisi Tropis Pesisir Kawasi
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {(weatherData?.dailyForecast && weatherData.dailyForecast.length > 0
                    ? weatherData.dailyForecast
                    : [
                        { day: 'Sab', code: 1, maxTemp: 30, minTemp: 24 },
                        { day: 'Min', code: 2, maxTemp: 31, minTemp: 24 },
                        { day: 'Sen', code: 61, maxTemp: 29, minTemp: 23 },
                        { day: 'Sel', code: 1, maxTemp: 30, minTemp: 24 },
                        { day: 'Rab', code: 2, maxTemp: 31, minTemp: 24 },
                        { day: 'Kam', code: 3, maxTemp: 30, minTemp: 23 },
                        { day: 'Jum', code: 61, maxTemp: 29, minTemp: 23 }
                      ]
                  ).map((fc, i) => {
                    const isToday = i === 0;
                    return (
                      <div 
                        key={i} 
                        className={`flex flex-col items-center py-2 px-1 rounded-xl border transition-all duration-200 hover:scale-105 cursor-default ${
                          isToday ? 'border-teal-500/50 bg-teal-500/10 shadow-xs' : 'border-transparent hover:border-[var(--border-main)]'
                        }`}
                        style={{
                          backgroundColor: isToday ? undefined : 'var(--input-bg, rgba(0,0,0,0.02))'
                        }}
                      >
                        <span className={`text-xs font-bold ${isToday ? 'text-teal-600 dark:text-teal-400 font-extrabold' : ''}`} style={{ color: isToday ? undefined : 'var(--text-main, #0f172a)' }}>
                          {fc.day}
                        </span>
                        <WeatherIcon code={fc.code} className="w-4 h-4 my-1.5" />
                        <span className="text-xs font-bold" style={{ color: 'var(--text-main, #0f172a)' }}>{fc.maxTemp}°</span>
                        <span className="text-xs opacity-60 text-[var(--text-muted)]">{fc.minTemp}°</span>
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
                      <span className="font-bold text-xs sm:text-sm tracking-tight" style={{ color: 'var(--text-main, #0f172a)' }}>
                        Waktu Operasional Site
                      </span>
                      <div className="text-xs text-[var(--text-muted)]">
                        Stasiun Kawasi (UTC +09:00)
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold border bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20">
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
                <div className="pt-3 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--border-main, rgba(148, 163, 184, 0.15))' }}>
                  <span className="flex items-center gap-1.5" style={{ color: 'var(--text-muted, #64748b)' }}>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Shift Operasional:</span>
                  </span>
                  <span className="font-bold font-mono" style={{ color: 'var(--primary, #2A9D8F)' }}>
                    {time.getHours() >= 7 && time.getHours() < 19 ? 'SHIFT 1 (DAY)' : 'SHIFT 2 (NIGHT)'}
                  </span>
                </div>
              </div>

              {/* FOCUS LOFI / YOUTUBE AUDIO PLAYER WIDGET */}
              <div 
                className="rounded-2xl border shadow-xl backdrop-blur-xl p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden"
                style={{
                  backgroundColor: 'var(--card-bg, rgba(255, 255, 255, 0.7))',
                  borderColor: 'var(--border-main, rgba(148, 163, 184, 0.2))'
                }}
              >
                {/* Embedded YouTube Player (Invisible by default, visible if user expands preview) */}
                <div className={showVideoPreview ? "mb-3 rounded-xl overflow-hidden aspect-video bg-black shadow-inner relative" : "hidden"}>
                  <iframe
                    ref={ytIframeRef}
                    id="ambient-yt-player"
                    width="100%"
                    height="100%"
                    src={`https://www.youtube-nocookie.com/embed/${currentStation.videoId}?enablejsapi=1&autoplay=${isPlaying ? 1 : 0}&rel=0&playsinline=1`}
                    title={currentStation.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    className="w-full h-full border-0"
                  />
                </div>

                {/* If preview is hidden, keep iframe active in DOM so audio stream continues */}
                {!showVideoPreview && (
                  <div className="sr-only pointer-events-none" aria-hidden="true">
                    <iframe
                      ref={ytIframeRef}
                      width="1"
                      height="1"
                      src={`https://www.youtube-nocookie.com/embed/${currentStation.videoId}?enablejsapi=1&autoplay=${isPlaying ? 1 : 0}&rel=0&playsinline=1`}
                      title={currentStation.title}
                      allow="autoplay; encrypted-media"
                    />
                  </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
                      <Music className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-xs sm:text-sm tracking-tight flex items-center gap-1.5" style={{ color: 'var(--text-main, #0f172a)' }}>
                        <span>Lab Focus & Ambient</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                          YT AUDIO
                        </span>
                      </span>
                      <div className="text-xs text-[var(--text-muted)]">
                        {currentStation.category} • Kawasi Station
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions Header (Station selector + Video Toggle + Animated Sound Waveform) */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setShowVideoPreview(!showVideoPreview)}
                      className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                        showVideoPreview 
                          ? 'bg-teal-500/20 text-teal-600 border-teal-500/40' 
                          : 'hover:bg-slate-500/10 border-transparent text-[var(--text-muted)]'
                      }`}
                      title={showVideoPreview ? 'Sembunyikan Video' : 'Tampilkan Video Visual'}
                    >
                      {showVideoPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>

                    <div className="flex items-center gap-0.5 h-4 px-2 py-1 rounded-md bg-slate-500/10">
                      <div className={`w-0.5 bg-teal-500 rounded-full transition-all duration-300 ${isPlaying ? 'h-3 animate-pulse' : 'h-1'}`} />
                      <div className={`w-0.5 bg-teal-500 rounded-full transition-all duration-200 ${isPlaying ? 'h-4 animate-bounce' : 'h-2'}`} />
                      <div className={`w-0.5 bg-teal-500 rounded-full transition-all duration-350 ${isPlaying ? 'h-2.5 animate-pulse' : 'h-1'}`} />
                      <div className={`w-0.5 bg-teal-500 rounded-full transition-all duration-150 ${isPlaying ? 'h-4 animate-bounce' : 'h-1.5'}`} />
                      <div className={`w-0.5 bg-teal-500 rounded-full transition-all duration-300 ${isPlaying ? 'h-3 animate-pulse' : 'h-1'}`} />
                    </div>
                  </div>
                </div>

                {/* Album Cover & Track Details */}
                <div className="flex items-center gap-3.5 mb-3 p-2 rounded-xl border relative group"
                  style={{
                    backgroundColor: 'var(--input-bg, rgba(0,0,0,0.02))',
                    borderColor: 'var(--border-main, rgba(148, 163, 184, 0.2))'
                  }}
                >
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden shadow-md flex-shrink-0 group">
                    <img 
                      src={mediaSettings.lofi || currentStation.coverUrl || DEFAULT_MEDIA.lofi} 
                      alt="Station Cover" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => setActiveSlot({ key: 'lofi', label: 'Widget Canvas Cover' })}
                        className="p-1.5 rounded-lg bg-black/80 hover:bg-teal-900 text-white text-xs border border-teal-500/50 cursor-pointer"
                        title="Ganti cover gambar"
                      >
                        <Camera className="w-3.5 h-3.5 text-teal-300" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs sm:text-sm truncate" style={{ color: 'var(--text-main, #0f172a)' }}>
                      {currentStation.title}
                    </div>
                    <div className="text-xs truncate text-[var(--text-muted)]">
                      {currentStation.channel} • Channel {stationIndex + 1}/{FOCUS_STATIONS.length}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-mono text-teal-600 dark:text-teal-400 font-semibold">
                        <Radio className="w-3 h-3" />
                        <span>{isPlaying ? 'Streaming Online' : 'Siap Diputar'}</span>
                      </span>
                      <button
                        onClick={() => setShowStationPicker(!showStationPicker)}
                        className="text-[11px] font-bold text-teal-600 hover:underline cursor-pointer flex items-center gap-0.5"
                      >
                        <Sliders className="w-2.5 h-2.5" />
                        <span>Ganti Channel</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Station Selection Dropdown (If toggled) */}
                {showStationPicker && (
                  <div className="mb-3 p-2 rounded-xl border bg-slate-900/90 text-white text-xs space-y-1 animate-in fade-in duration-150">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 pb-1 border-b border-slate-800 flex items-center justify-between">
                      <span>Pilih Saluran Audio YouTube</span>
                      <button onClick={() => setShowStationPicker(false)} className="text-slate-400 hover:text-white">✕</button>
                    </div>
                    {FOCUS_STATIONS.map((st, i) => (
                      <button
                        key={st.id}
                        onClick={() => {
                          changeStation(i);
                          setShowStationPicker(false);
                        }}
                        className={`w-full text-left p-1.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                          stationIndex === i ? 'bg-teal-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <span className="truncate pr-2">{st.title}</span>
                        <span className="text-[10px] font-mono opacity-80 shrink-0">{st.category}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Player Controls */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    {/* Media playback buttons */}
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => changeStation(stationIndex - 1)}
                        className="p-1.5 rounded-lg hover:bg-slate-500/10 text-[var(--text-muted)] transition-colors cursor-pointer"
                        title="Channel Sebelumnya"
                      >
                        <SkipBack className="w-3.5 h-3.5" />
                      </button>

                      <button 
                        onClick={togglePlayAudio}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        style={{ backgroundColor: 'var(--primary, #2A9D8F)' }}
                        title={isPlaying ? 'Pause Audio' : 'Play YouTube Audio'}
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                      </button>

                      <button 
                        onClick={() => changeStation(stationIndex + 1)}
                        className="p-1.5 rounded-lg hover:bg-slate-500/10 text-[var(--text-muted)] transition-colors cursor-pointer"
                        title="Channel Berikutnya"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                      </button>

                      <button 
                        onClick={() => {
                          sendYtCommand('seekTo', 0);
                          toast.info('Memutar ulang dari awal');
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-500/10 text-[var(--text-muted)] transition-colors cursor-pointer"
                        title="Restart Track"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Volume Slider */}
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={toggleMute}
                        className="p-1 rounded-md text-[var(--text-muted)] hover:text-teal-600 transition-colors cursor-pointer"
                        title={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                      <input 
                        type="range"
                        min="0"
                        max="100"
                        value={isMuted ? 0 : volume}
                        onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                        className="w-16 h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-300 dark:bg-slate-700 accent-teal-600"
                        title={`Volume: ${isMuted ? 'Muted' : `${volume}%`}`}
                      />
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
              {/* Optional Label / Description Customizer for Gallery Slots */}
              {activeSlot.key.startsWith('gallery_') && (
                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-teal-400" />
                      <span>Deskripsi / Label Foto</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Kosongkan jika ingin tanpa tulisan</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tempLabel}
                      onChange={(e) => setTempLabel(e.target.value)}
                      placeholder="Contoh: 🔬 Analytical Lab (kosongkan untuk hilangkan)"
                      className="flex-1 bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-xl px-3 py-2 outline-none focus:border-teal-400 placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        const labelKey = `${activeSlot.key}_label` as keyof DashboardMediaSettings;
                        handleSaveSettings({ [labelKey]: tempLabel.trim() }, 'Deskripsi foto diperbarui!');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs cursor-pointer active:scale-95 transition-all shadow-md shrink-0"
                    >
                      Simpan Teks
                    </button>
                    {tempLabel && (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => {
                          setTempLabel('');
                          const labelKey = `${activeSlot.key}_label` as keyof DashboardMediaSettings;
                          handleSaveSettings({ [labelKey]: '' }, 'Deskripsi foto dihilangkan!');
                        }}
                        className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold cursor-pointer transition-all shrink-0"
                        title="Hapus Label (Foto Bersih)"
                      >
                        Hapus Teks
                      </button>
                    )}
                  </div>
                </div>
              )}

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

      {/* Fullscreen High-Resolution Image Preview Lightbox */}
      <ImageModal
        imageUrl={previewImage?.url || null}
        title={previewImage?.title || 'Pratinjau Foto'}
        isOpen={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
}
