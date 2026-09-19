import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Card, Button } from '../components/ui';
import { 
  LogOut, Briefcase, MapPin, Building, Hash, CalendarIcon, 
  Users, UserCircle2, ArrowLeft, Plane, Info, X, Camera, 
  Trash2, Image as ImageIcon, Calendar, Sparkles, Check, Upload, RefreshCw,
  Trophy, Award, Shield, ChevronRight, Zap, Star, Medal, Crown, BarChart3
} from 'lucide-react';
import { getRankByXp } from '../lib/pointBlankRanks';
import { getRosterData } from '../sheets-api';
import { motion, useDragControls } from 'motion/react';
import { toast } from 'sonner';
import { UsernamePromptModal } from '../components/UsernamePromptModal';
import { PixelAvatarModal } from '../components/PixelAvatarModal';
import { 
  getFrameById, 
  TIERED_ACHIEVEMENTS, 
  calculateBranchProgress, 
  getAchievementTierStyle 
} from '../lib/gamificationEngine';
import { DynamicAvatarFrame } from '../components/DynamicAvatarFrame';
import { PromotionWelcomeModal } from '../components/PromotionWelcomeModal';
import { ExpAuditModal } from '../components/ExpAuditModal';

export const PRESET_PROFILE_COVERS = [
  {
    id: 'cyber-lab',
    name: 'Cyber Lab Neon',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0d9488 100%)',
    vibe: 'Futuristik Cyberpunk'
  },
  {
    id: 'emerald-aurora',
    name: 'Emerald Aurora',
    gradient: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #10b981 100%)',
    vibe: 'Mining & Nature Glow'
  },
  {
    id: 'golden-pit',
    name: 'Golden Pit Sunset',
    gradient: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 50%, #fbbf24 100%)',
    vibe: 'Industrial Golden Hour'
  },
  {
    id: 'synthwave-purple',
    name: 'Deep Ultraviolet',
    gradient: 'linear-gradient(135deg, #311042 0%, #581c87 50%, #ec4899 100%)',
    vibe: 'Synthwave & Midnight'
  },
  {
    id: 'arctic-ocean',
    name: 'Arctic Clean Lab',
    gradient: 'linear-gradient(135deg, #0c4a6e 0%, #0284c7 50%, #38bdf8 100%)',
    vibe: 'Clean Precision Laboratory'
  },
  {
    id: 'obsidian-carbon',
    name: 'Obsidian Minimal',
    gradient: 'linear-gradient(135deg, #09090b 0%, #18181b 50%, #27272a 100%)',
    vibe: 'Stealth Dark Carbon'
  }
];

function parseStringDate(str: string | null | undefined) {
  if (!str || str === '-') return null;
  const parts = str.replace(/-/g, ' ').split(' ');
  if (parts.length >= 3) {
    const mmap: Record<string, number> = {Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11};
    let year = parseInt(parts[2]);
    if (year < 100) year += 2000;
    return new Date(year, mmap[parts[1]] || 0, parseInt(parts[0]));
  }
  return new Date(str);
}

export function ProfilePage({ 
  inspectorName, 
  inspectorNik, 
  onLogout,
  onBack
}: { 
  inspectorName: string | null; 
  inspectorNik: string | null; 
  onLogout: () => void;
  onBack: () => void;
}) {
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [showPromotionModal, setShowPromotionModal] = useState(false);

  const [profile, setProfile] = useState<any>(() => {
    const saved = localStorage.getItem('p2h_inspector_profile');
    return saved ? JSON.parse(saved) : null;
  });

  const [avatar, setAvatar] = useState<string | null>(() => {
    if (profile?.avatar) return profile.avatar;
    if (inspectorNik) {
      return localStorage.getItem(`p2h_inspector_avatar_${inspectorNik}`);
    }
    return null;
  });

  const [cover, setCover] = useState<string | null>(() => {
    if (profile?.cover) return profile.cover;
    if (inspectorNik) {
      return localStorage.getItem(`p2h_inspector_cover_${inspectorNik}`);
    }
    return null;
  });

  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isPixelAvatarOpen, setIsPixelAvatarOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  const [myRosterData, setMyRosterData] = useState<any>(null);
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : true);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (JPG, PNG, WebP)');
      return;
    }

    setIsUploading(true);
    toast.loading('Mengompresi & mengunggah foto...', { id: 'avatar-upload' });

    const origKb = (file.size / 1024).toFixed(1);
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 300; // 300x300 crisp compressed avatar
          canvas.width = maxDim;
          canvas.height = maxDim;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            toast.error('Gagal memproses canvas gambar', { id: 'avatar-upload' });
            setIsUploading(false);
            return;
          }

          // Center-crop square math
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, maxDim, maxDim);

          // Compress to lightweight JPEG base64 string
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.78);
          const compKb = (compressedDataUrl.length * (3 / 4) / 1024).toFixed(1);

          // Update state & LocalStorage
          setAvatar(compressedDataUrl);

          if (profile) {
            const updatedProfile = { ...profile, avatar: compressedDataUrl };
            setProfile(updatedProfile);
            localStorage.setItem('p2h_inspector_profile', JSON.stringify(updatedProfile));
          }

          if (inspectorNik) {
            localStorage.setItem(`p2h_inspector_avatar_${inspectorNik}`, compressedDataUrl);
          }
          
          window.dispatchEvent(new Event('profile_updated'));

          // Sync to database backend
          try {
            if (inspectorNik) {
              await fetch('/api/employees/avatar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nik: inspectorNik, avatar: compressedDataUrl }),
              });
            }
          } catch (apiErr) {
            console.warn('Backend avatar sync warning:', apiErr);
          }

          toast.success(`Foto profil diperbarui! (${origKb} KB → ${compKb} KB)`, { id: 'avatar-upload' });
        } catch (err: any) {
          console.error(err);
          toast.error('Gagal memproses foto: ' + err.message, { id: 'avatar-upload' });
        } finally {
          setIsUploading(false);
        }
      };
      img.onerror = () => {
        toast.error('Format gambar tidak valid', { id: 'avatar-upload' });
        setIsUploading(false);
      };
      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (JPG, PNG, WebP)');
      return;
    }

    setIsUploadingCover(true);
    toast.loading('Mengompresi & memasang background...', { id: 'cover-upload' });

    const origKb = (file.size / 1024).toFixed(1);
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          const maxW = 1200;
          const maxH = 500;
          let width = img.width;
          let height = img.height;

          if (width > maxW) {
            height = (height * maxW) / width;
            width = maxW;
          }
          if (height > maxH) {
            width = (width * maxH) / height;
            height = maxH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            toast.error('Gagal memproses canvas background', { id: 'cover-upload' });
            setIsUploadingCover(false);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to lightweight JPEG base64 string
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          const compKb = (compressedDataUrl.length * (3 / 4) / 1024).toFixed(1);

          setCover(compressedDataUrl);

          if (profile) {
            const updatedProfile = { ...profile, cover: compressedDataUrl };
            setProfile(updatedProfile);
            localStorage.setItem('p2h_inspector_profile', JSON.stringify(updatedProfile));
          }

          if (inspectorNik) {
            localStorage.setItem(`p2h_inspector_cover_${inspectorNik}`, compressedDataUrl);
          }

          window.dispatchEvent(new Event('profile_updated'));

          // Sync to backend
          try {
            if (inspectorNik) {
              await fetch('/api/employees/cover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nik: inspectorNik, cover: compressedDataUrl }),
              });
            }
          } catch (apiErr) {
            console.warn('Backend cover sync warning:', apiErr);
          }

          toast.success(`Background profil diperbarui! (${origKb} KB → ${compKb} KB)`, { id: 'cover-upload' });
          setShowCoverModal(false);
        } catch (err: any) {
          console.error(err);
          toast.error('Gagal memproses background: ' + err.message, { id: 'cover-upload' });
        } finally {
          setIsUploadingCover(false);
        }
      };
      img.onerror = () => {
        toast.error('Format gambar tidak valid', { id: 'cover-upload' });
        setIsUploadingCover(false);
      };
      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  };

  const handleSetPresetCover = async (gradientString: string) => {
    setCover(gradientString);
    if (profile) {
      const updatedProfile = { ...profile, cover: gradientString };
      setProfile(updatedProfile);
      localStorage.setItem('p2h_inspector_profile', JSON.stringify(updatedProfile));
    }
    if (inspectorNik) {
      localStorage.setItem(`p2h_inspector_cover_${inspectorNik}`, gradientString);
    }
    window.dispatchEvent(new Event('profile_updated'));

    try {
      if (inspectorNik) {
        await fetch('/api/employees/cover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nik: inspectorNik, cover: gradientString }),
        });
      }
    } catch (e) {}

    toast.success('Tema background profil diterapkan!');
    setShowCoverModal(false);
  };

  const handleRemoveCover = async () => {
    setCover(null);
    if (profile) {
      const updatedProfile = { ...profile, cover: null };
      setProfile(updatedProfile);
      localStorage.setItem('p2h_inspector_profile', JSON.stringify(updatedProfile));
    }
    if (inspectorNik) {
      localStorage.removeItem(`p2h_inspector_cover_${inspectorNik}`);
    }
    window.dispatchEvent(new Event('profile_updated'));

    try {
      if (inspectorNik) {
        await fetch('/api/employees/cover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nik: inspectorNik, cover: null }),
        });
      }
    } catch (e) {}

    toast.success('Background profil dikembalikan ke tema default!');
    setShowCoverModal(false);
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const dragControls = useDragControls();

  // Load avatar and cover from localStorage or backend if not yet in state
  useEffect(() => {
    if (inspectorNik) {
      const cachedAvatar = localStorage.getItem(`p2h_inspector_avatar_${inspectorNik}`);
      if (cachedAvatar && !avatar) {
        setAvatar(cachedAvatar);
      }

      const cachedCover = localStorage.getItem(`p2h_inspector_cover_${inspectorNik}`);
      if (cachedCover && !cover) {
        setCover(cachedCover);
      }

      // Also fetch fresh from backend
      fetch(`/api/employees/${encodeURIComponent(inspectorNik)}`)
        .then(res => res.json())
        .then(data => {
          const emp = data?.employee || data;
          if (emp?.avatar) {
            setAvatar(emp.avatar);
            localStorage.setItem(`p2h_inspector_avatar_${inspectorNik}`, emp.avatar);
          }
          if (emp?.cover) {
            setCover(emp.cover);
            localStorage.setItem(`p2h_inspector_cover_${inspectorNik}`, emp.cover);
          }
          if (emp && !profile) {
            setProfile(emp);
          }
        })
        .catch(() => {});
    }
  }, [inspectorNik]);

  // Lock background scroll when drawer is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadRoster = async () => {
      setLoadingRoster(true);
      try {
        const res: any = await getRosterData();
        const rosterList = Array.isArray(res) ? res : (res?.roster || []);
        
        const me = rosterList.find((r: any) => {
          const matchNik = inspectorNik && r.nik && String(r.nik).trim() === String(inspectorNik).trim();
          const rName = (r.name || r.nama || '').toLowerCase();
          const targetName = (inspectorName || '').toLowerCase();
          const matchName = targetName && rName && (rName.includes(targetName) || targetName.includes(rName));
          return matchNik || matchName;
        });

        if (isMounted) {
          setMyRosterData(me || null);
        }
      } catch (e) {
        console.error("Failed to load roster data for profile", e);
      } finally {
        if (isMounted) {
          setLoadingRoster(false);
        }
      }
    };
    loadRoster();
    return () => { isMounted = false; };
  }, [inspectorName, inspectorNik]);

  // Gamification & Vanguard Rank Data
  const [gamificationData, setGamificationData] = useState<any>(null);
  const [loadingGamification, setLoadingGamification] = useState(true);
  const [gamificationRefreshTick, setGamificationRefreshTick] = useState(0);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [profileLeaderboard, setProfileLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    if (showAuditModal && profileLeaderboard.length === 0) {
      fetch('/api/gamification/leaderboard')
        .then(res => res.json())
        .then(data => {
          if (data?.leaderboard) setProfileLeaderboard(data.leaderboard);
        })
        .catch(() => {});
    }
  }, [showAuditModal, profileLeaderboard.length]);

  useEffect(() => {
    const handleUpdate = () => {
      setGamificationRefreshTick(t => t + 1);
    };
    window.addEventListener('gamification_updated', handleUpdate);
    window.addEventListener('profile_updated', handleUpdate);
    return () => {
      window.removeEventListener('gamification_updated', handleUpdate);
      window.removeEventListener('profile_updated', handleUpdate);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (!inspectorNik) {
      setLoadingGamification(false);
      return;
    }
    fetch(`/api/gamification/user-stats/${encodeURIComponent(inspectorNik)}`)
      .then(res => res.json())
      .then(json => {
        if (isMounted) {
          const data = json.data || json;
          setGamificationData(data);
        }
      })
      .catch(err => console.error('Failed to load gamification stats', err))
      .finally(() => {
        if (isMounted) setLoadingGamification(false);
      });
    return () => { isMounted = false; };
  }, [inspectorNik, gamificationRefreshTick]);

  const rankInfo = useMemo(() => {
    if (gamificationData?.rankInfo) {
      return gamificationData.rankInfo;
    }
    if (gamificationData?.rank) {
      return gamificationData.rank;
    }
    if (typeof gamificationData?.totalXp === 'number') {
      return getRankByXp(gamificationData.totalXp);
    }
    return getRankByXp(0);
  }, [gamificationData]);

  const activeMilitaryTitle = useMemo(() => {
    const saved = localStorage.getItem('preplab_equipped_title');
    if (saved && saved !== 'Frontline Scout') {
      return saved;
    }
    return gamificationData?.defaultTitle || gamificationData?.equippedTitle || 'Frontline Trainee';
  }, [gamificationData]);

  const activeAvatarFrame = useMemo(() => {
    const saved = localStorage.getItem('preplab_equipped_frame');
    return saved || gamificationData?.equippedFrame || 'default';
  }, [gamificationData]);

  // Compute earned achievement medals and their progressive tier border styles
  const earnedBranches = useMemo(() => {
    if (!gamificationData?.stats) return [];
    const stats = gamificationData.stats;
    const countKeyMap: Record<string, number> = {
      BRANCH_KTA: stats.ktaCount || 0,
      BRANCH_INSPECTION: stats.inspectionCount || 0,
      BRANCH_DEFECTS: stats.defectsCount || 0,
      BRANCH_CS: stats.csCount || 0,
      BRANCH_FEEDBACK: stats.feedbackCount || 0,
      BRANCH_QUOTES: stats.quotesCount || 0,
      BRANCH_THEMES: stats.themesCount || 0,
      BRANCH_BULLETIN: stats.bulletinCount || 0,
      BRANCH_P5M_SPEAKER: stats.p5mSpeakerCount || 0,
      BRANCH_WO_CREATE: stats.woCreateCount || 0,
      BRANCH_WO_RESOLVE: stats.woResolveCount || 0,
      BRANCH_QUIZ: stats.quiz100Count || 0,
      BRANCH_LOGIN_STREAK: stats.loginStreak || 0,
      BRANCH_NIGHT: stats.nightCount || 0,
      BRANCH_DAWN: stats.dawnCount || 0,
      BRANCH_WEEKEND: stats.weekendCount || 0,
      BRANCH_POLYMATH: stats.polymathCount || 0,
      BRANCH_EASTER_EGG: stats.easterEggCount || 0,
      BRANCH_SEASON: stats.seasonChampionCount || 0
    };

    return TIERED_ACHIEVEMENTS.map(branch => {
      const currentCount = countKeyMap[branch.code] || 0;
      const progressInfo = calculateBranchProgress(branch, currentCount);
      const tierLevel = progressInfo.currentTier ? progressInfo.currentTier.tierLevel : 0;
      return {
        branch,
        currentCount,
        progressInfo,
        tierLevel,
        tierStyle: getAchievementTierStyle(tierLevel)
      };
    }).filter(b => b.tierLevel > 0);
  }, [gamificationData]);

  const activeFrameTier = useMemo(() => {
    const frameObj = getFrameById(activeAvatarFrame);
    if (!frameObj.sourceAchId) return 4;
    const branch = earnedBranches.find((b: any) => b.branch?.id === frameObj.sourceAchId || b.branch?.code === frameObj.sourceAchId);
    return branch?.tierLevel || 1;
  }, [activeAvatarFrame, earnedBranches]);

  // Calculate detailed cuti info
  const cutiInfo = React.useMemo(() => {
    const source = myRosterData || profile || {};

    let joinDate: Date | null = null;
    const rawJoin = source.tgl_masuk_format || source.tanggalAwalBergabung || source.joinDate || source.tgl_masuk;
    if (rawJoin && rawJoin !== '-') {
      joinDate = new Date(rawJoin);
      if (isNaN(joinDate.getTime())) {
        joinDate = parseStringDate(rawJoin);
      }
    }

    let isYear5 = false;
    if (joinDate && !isNaN(joinDate.getTime())) {
      const diffMs = new Date().getTime() - joinDate.getTime();
      const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
      if (diffYears >= 5) {
        isYear5 = true;
      }
    }

    const totalKuota = isYear5 ? 24 : 12;
    const totalUsed = parseFloat(source.total_cuti_tahunan || source.totalCuti || '0') || 0;
    const izinUsed = parseFloat(source.total_izin || source.totalIzin || '0') || 0;
    const remaining = Math.max(0, totalKuota - totalUsed);

    // Calculate next cuti estimate
    let planDate: Date | null = null;
    let actualDate: Date | null = null;
    let hasTrv = false;

    const rawPlan = source.cuti_plan_format || source.cuti_plan;
    if (rawPlan && rawPlan !== '-') {
      planDate = new Date(rawPlan);
      if (isNaN(planDate.getTime())) planDate = parseStringDate(rawPlan);
    }

    const rawAktual = source.cuti_aktual_format || source.cuti_aktual || source.nextTrvDate;
    if (rawAktual && rawAktual !== '-') {
      actualDate = new Date(rawAktual);
      if (isNaN(actualDate.getTime())) actualDate = parseStringDate(rawAktual);
      hasTrv = true;
    }

    // Fallback rotation calculation (10:2 weeks = 70 days on, 14 days off)
    let autoNextCuti: Date | null = null;
    const rawLast = source.trv_terakhir_format || source.trv_terakhir || source.lastTrvDate;
    if (!planDate && !actualDate && rawLast && rawLast !== '-') {
      const lastTrv = new Date(rawLast);
      if (!isNaN(lastTrv.getTime())) {
        autoNextCuti = new Date(lastTrv.getTime() + (70 * 24 * 60 * 60 * 1000));
      }
    }

    const finalNextCuti = actualDate || planDate || autoNextCuti;
    let daysRemaining = 0;
    let difference = 0;

    if (finalNextCuti && !isNaN(finalNextCuti.getTime())) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(finalNextCuti);
      target.setHours(0, 0, 0, 0);
      daysRemaining = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }

    if (planDate && actualDate && !isNaN(planDate.getTime()) && !isNaN(actualDate.getTime())) {
      difference = Math.round((actualDate.getTime() - planDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      isYear5,
      totalKuota,
      totalUsed,
      izinUsed,
      remaining,
      joinDate,
      planCuti: planDate,
      actualCuti: finalNextCuti,
      daysRemaining,
      difference,
      hasTrv
    };
  }, [myRosterData, profile]);

  // Generate fallback avatar letter initials
  const initials = (inspectorName || '?')
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  return (
    <>
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onBack}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
      />

      {/* Drawer Panel */}
      <motion.div 
        initial={{ y: "100%", x: 0 }}
        animate={{ y: 0, x: 0 }}
        exit={{ y: "100%", x: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        drag={isMobile ? "y" : false}
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 140 || info.velocity.y > 450) {
            onBack();
          }
        }}
        className="fixed inset-x-0 bottom-0 top-10 md:top-0 md:left-auto md:right-0 z-[60] w-full md:w-[440px] lg:w-[500px] h-[calc(100dvh-2.5rem)] md:h-full rounded-t-[28px] md:rounded-none shadow-2xl md:border-l flex flex-col overflow-hidden transition-colors"
        style={{
          backgroundColor: 'var(--bg-main, #F8FAFC)',
          borderColor: 'var(--border-main, #E2E8F0)',
          color: 'var(--text-main, #1E293B)'
        }}
      >
        {/* Mobile Pull Indicator Handle */}
        <div 
          className="w-full flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing shrink-0 md:hidden touch-none"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <div 
            className="w-12 h-1.5 rounded-full transition-colors"
            style={{ backgroundColor: 'var(--border-main, #CBD5E1)' }}
          />
        </div>

        {/* Header Bar */}
        <div 
          className="sticky top-0 z-20 backdrop-blur-md px-4 sm:px-6 py-3.5 flex items-center justify-between border-b shrink-0 select-none transition-colors"
          style={{
            backgroundColor: 'var(--bg-main, #F8FAFC)',
            borderColor: 'var(--border-main, #E2E8F0)'
          }}
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest('button')) return;
            if (isMobile) dragControls.start(e);
          }}
        >
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack} 
              className="p-2 -ml-2 rounded-full border transition-colors shadow-2xs active:scale-95 cursor-pointer"
              style={{
                backgroundColor: 'var(--input-bg, #FFFFFF)',
                borderColor: 'var(--border-main, #E2E8F0)',
                color: 'var(--text-main, #1E293B)'
              }}
              aria-label="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-display font-bold leading-tight" style={{ color: 'var(--text-main, #1E293B)' }}>
                Profil Karyawan
              </h1>
              <p className="text-[11px] font-medium" style={{ color: 'var(--text-muted, #64748B)' }}>
                Preparation & Laboratory Department
              </p>
            </div>
          </div>
          <button 
            onClick={onBack} 
            className="p-2 rounded-full border transition-colors md:hidden cursor-pointer shadow-2xs"
            style={{
              backgroundColor: 'var(--input-bg, #FFFFFF)',
              borderColor: 'var(--border-main, #E2E8F0)',
              color: 'var(--text-muted, #64748B)'
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto overscroll-contain pb-28">
          {/* Hidden File Input for Avatar */}
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            onChange={handleImageSelect} 
            className="hidden" 
          />

          {/* Hidden File Input for Background / Cover */}
          <input 
            type="file" 
            ref={coverFileInputRef} 
            accept="image/*" 
            onChange={handleCoverSelect} 
            className="hidden" 
          />

          {/* Hero Profile Card */}
          <Card 
            className="overflow-hidden border shadow-lg relative"
            style={{
              backgroundColor: 'var(--card-bg, #FFFFFF)',
              borderColor: 'var(--border-main, #E2E8F0)'
            }}
          >
            {/* Top Banner Background & Wallpaper */}
            <div 
              className="h-28 sm:h-36 relative overflow-hidden group/banner select-none transition-all duration-300"
              style={{
                background: cover 
                  ? (cover.startsWith('linear-gradient') ? cover : `url(${cover}) center / cover no-repeat`) 
                  : 'linear-gradient(to right, var(--primary, #0D9488), var(--primary-hover, #0F766E), var(--accent, #14B8A6))'
              }}
            >
              {/* Overlay Gradient for contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />

              {/* Edit Background / Cover Button in Top Right */}
              <div className="absolute top-2.5 right-2.5 z-10">
                <button
                  type="button"
                  onClick={() => setShowCoverModal(true)}
                  className="px-2.5 py-1 rounded-xl text-xs font-semibold backdrop-blur-md bg-black/40 hover:bg-black/60 text-white border border-white/20 shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  title="Kustomisasi Background / Cover Profil"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-amber-300" />
                  <span>Ubah Background</span>
                </button>
              </div>
            </div>

            <div className="px-5 pb-5 relative">
              <div className="flex justify-between items-end -mt-10 sm:-mt-12 mb-4">
                {/* Avatar Box with Equipped Dynamic Frame Ring */}
                <div className="relative group">
                  <DynamicAvatarFrame
                    frameId={activeAvatarFrame}
                    tierLevel={activeFrameTier}
                    size={96}
                    isUnlocked={true}
                  >
                    {avatar ? (
                      <img 
                        src={avatar} 
                        alt={inspectorName || 'Foto Profil'} 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div 
                        className="w-full h-full rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold font-display"
                        style={{
                          backgroundColor: 'var(--input-bg, rgba(42, 157, 143, 0.1))',
                          color: 'var(--primary, #2A9D8F)'
                        }}
                      >
                        {initials}
                      </div>
                    )}

                    {isUploading && (
                      <div className="absolute inset-0 bg-black/70 rounded-full flex flex-col items-center justify-center text-white p-1 z-30">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mb-1" />
                        <span className="text-[9px] font-medium">Kompresi...</span>
                      </div>
                    )}
                  </DynamicAvatarFrame>

                  {/* Camera Upload Badge Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="absolute -bottom-1 -right-1 p-2 text-white rounded-xl shadow-md transition-all active:scale-90 border-2 flex items-center justify-center group-hover:scale-105 cursor-pointer"
                    style={{
                      backgroundColor: 'var(--primary, #2A9D8F)',
                      borderColor: 'var(--card-bg, #FFFFFF)'
                    }}
                    title="Ganti Foto Profil"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button 
                    type="button"
                    onClick={() => setShowPromotionModal(true)}
                    className="rounded-xl flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 shadow-xs h-8 sm:h-9 text-xs font-bold border transition-all active:scale-95 cursor-pointer bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-700 dark:text-amber-300 border-amber-500/40"
                    title="Buka Upacara Promosi Pangkat Resmi"
                  >
                    <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="hidden xs:inline sm:inline">Upacara Promosi</span>
                    <span className="xs:hidden sm:hidden">Promosi</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => setIsPixelAvatarOpen(true)}
                    className="rounded-xl flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 shadow-xs h-8 sm:h-9 text-xs font-bold border transition-all active:scale-95 cursor-pointer bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border-amber-500/40"
                    title="Buka Pixel Avatar Studio"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse shrink-0" />
                    <span className="hidden xs:inline sm:inline">Pixel Avatar Studio</span>
                    <span className="xs:hidden sm:hidden">Studio</span>
                  </button>

                  <Button 
                    onClick={onLogout} 
                    variant="danger" 
                    className="rounded-xl flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 shadow-xs h-8 sm:h-9 text-xs font-bold cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 shrink-0" /> 
                    <span>Keluar</span>
                  </Button>
                </div>
              </div>
              
              <div className="space-y-3.5">
                {/* Hero Identity: Logo Pangkat Seukuran Font Nama (Tanpa Background Hitam), Title di Bawah Nama, Username di Bawah Title */}
                <div className="pt-1">
                  {/* Baris 1: Logo Pangkat + Nama Lengkap */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <img 
                      src={rankInfo?.currentRank?.icon || '/assets/ranks/rank_01_trainee.svg'} 
                      alt={rankInfo?.currentRank?.name || 'Pangkat'}
                      className="w-6 h-6 sm:w-7 sm:h-7 object-contain inline-block shrink-0 filter drop-shadow-sm cursor-pointer hover:scale-110 transition-transform"
                      title={`Pangkat Kehormatan: #${rankInfo?.currentRank?.id || 1} ${rankInfo?.currentRank?.name || 'Trainee'} (Klik untuk buka Hall of Fame)`}
                      onClick={() => {
                        onBack();
                        window.dispatchEvent(new CustomEvent('navigate-tab', { detail: { tab: 'leaderboard' } }));
                      }}
                    />
                    <h2 className="text-lg sm:text-2xl font-display font-bold tracking-tight text-[var(--text-main)] leading-snug break-words">
                      {inspectorName}
                    </h2>
                  </div>

                  {/* Baris 2: Title Kehormatan di Bawah Nama */}
                  <div className="mt-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-bold shadow-2xs w-fit">
                      <Award className="w-3 h-3 text-amber-500 shrink-0" />
                      <span>[{activeMilitaryTitle}]</span>
                    </span>
                  </div>

                  {/* Baris 3: Username / Callsign di Bawah Title */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span 
                      className="text-xs font-mono font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 w-fit"
                      style={{
                        backgroundColor: 'var(--input-bg, rgba(42, 157, 143, 0.1))',
                        borderColor: 'var(--border-main, #E2E8F0)',
                        color: 'var(--primary, #2A9D8F)'
                      }}
                    >
                      @{profile?.username || 'Username belum disetel'}
                    </span>
                    <button 
                      type="button"
                      onClick={() => setShowUsernameModal(true)} 
                      className="text-xs font-bold underline flex items-center gap-0.5 cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ color: 'var(--primary, #2A9D8F)' }}
                    >
                      Ubah Panggilan
                    </button>
                  </div>
                </div>

                {/* Metadata Badges Pill Row */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border-main)]/70">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 whitespace-nowrap">
                    <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    {rankInfo?.currentRank?.name}
                  </span>

                  <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/25 font-mono whitespace-nowrap">
                    {rankInfo?.currentRank?.tierGroup || rankInfo?.currentRank?.tier}
                  </span>

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--input-bg)] text-[var(--text-muted)] border border-[var(--border-main)] whitespace-nowrap">
                    <Building className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                    {myRosterData?.pt || profile?.pt || 'TBP'} · {myRosterData?.section || profile?.section || 'Prep-Lab'}
                  </span>

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-[var(--input-bg)] text-[var(--text-main)] border border-[var(--border-main)] whitespace-nowrap">
                    <Hash className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                    {inspectorNik || '-'}
                  </span>

                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    Aktif
                  </span>
                </div>

                {/* Progress Bar Akumulasi EXP Kemahiran */}
                {(() => {
                  const safeCurrentXp = typeof rankInfo?.currentXp === 'number' 
                    ? rankInfo.currentXp 
                    : (typeof gamificationData?.totalXp === 'number' ? gamificationData.totalXp : 0);
                  const safeNeededXp = typeof rankInfo?.neededXp === 'number' 
                    ? rankInfo.neededXp 
                    : (rankInfo?.nextRank ? rankInfo.nextRank.minXp : (rankInfo?.currentRank?.maxXp || 100));
                  const safePercent = typeof rankInfo?.progressPercent === 'number' ? rankInfo.progressPercent : 0;

                  return (
                    <div className="pt-3 border-t border-[var(--border-main)] space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs font-semibold">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="text-[var(--text-muted)]">Akumulasi EXP Kemahiran</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20 whitespace-nowrap">
                            Tingkat {rankInfo?.currentRank?.id || 1}/51
                          </span>
                        </div>
                        <div className="flex items-center gap-2 sm:justify-end">
                          <span className="font-mono font-bold text-[var(--text-main)]">
                            {safeCurrentXp.toLocaleString()} / {safeNeededXp.toLocaleString()} EXP
                          </span>
                          <span className="text-teal-600 dark:text-teal-400 font-sans text-xs font-bold">
                            ({safePercent}%)
                          </span>
                        </div>
                      </div>

                      <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700/60 overflow-hidden p-0.5 border border-[var(--border-main)]">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, Math.max(2, safePercent))}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full bg-gradient-to-r from-teal-500 via-emerald-400 to-amber-400 shadow-xs"
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[10px] text-[var(--text-muted)]">
                        <span>
                          Target Berikutnya: <strong className="text-[var(--text-main)]">{rankInfo?.nextRank ? rankInfo.nextRank.name : 'Supreme Vanguard Commander'}</strong>
                          {rankInfo?.nextRank && ` · Sisa ${Math.max(0, safeNeededXp - safeCurrentXp).toLocaleString()} EXP lagi`}
                        </span>
                        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
                          <button
                            type="button"
                            onClick={() => setShowAuditModal(true)}
                            className="text-amber-600 dark:text-amber-400 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                            title="Buka Tabel Rekapitulasi & Audit Perolehan EXP"
                          >
                            <BarChart3 className="w-3 h-3" />
                            <span>Rekap Perolehan EXP</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onBack();
                              window.dispatchEvent(new CustomEvent('navigate-tab', { detail: { tab: 'leaderboard' } }));
                            }}
                            className="text-teal-600 dark:text-teal-400 font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                          >
                            <span>Lihat Klasemen Hall of Fame</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

          </Card>

          {/* Card Showcase Prestasi & Medali Kehormatan */}
          <Card 
            className="p-5 sm:p-6 shadow-md space-y-4 border"
            style={{
              backgroundColor: 'var(--card-bg, #FFFFFF)',
              borderColor: 'var(--border-main, #E2E8F0)'
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3.5" style={{ borderColor: 'var(--border-main)' }}>
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    <Medal className="w-4 h-4" />
                  </span>
                  <h3 className="font-bold text-sm sm:text-base font-display text-[var(--text-main)]">
                    Etalase Medali &amp; Prestasi Kehormatan
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400 font-bold">
                    {earnedBranches.length}/{TIERED_ACHIEVEMENTS.length} Terbuka
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Koleksi medali operasional dengan ketebalan border &amp; efek aura sesuai tingkatan kelas (Bronze 2px · Silver 3px · Gold 4px · Master 5px).
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  onBack();
                  window.dispatchEvent(new CustomEvent('navigate-tab', { detail: { tab: 'leaderboard' } }));
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer self-start sm:self-auto"
              >
                <span>Jelajahi 12 Cabang Lengkap</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {earnedBranches.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
                {earnedBranches.map(({ branch, currentCount, progressInfo, tierStyle }) => (
                  <div
                    key={branch.id}
                    onClick={() => {
                      onBack();
                      window.dispatchEvent(new CustomEvent('navigate-tab', { detail: { tab: 'leaderboard' } }));
                    }}
                    className={`p-4 rounded-2xl ${tierStyle.cardBorder} ${tierStyle.cardShadow} relative overflow-hidden flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-all bg-[var(--card-bg)]`}
                  >
                    {/* Ambient glow in corner */}
                    <div className={`absolute -top-10 -right-10 w-28 h-28 bg-gradient-to-bl ${tierStyle.cardGlowAura} rounded-full blur-xl pointer-events-none`} />

                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className={`w-11 h-11 rounded-xl ${tierStyle.iconRing} flex items-center justify-center text-xl shadow-sm shrink-0`}>
                          {branch.icon}
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full ${tierStyle.badgePill} flex items-center gap-1`}>
                            <span>{tierStyle.badgeEmoji}</span>
                            <span>{tierStyle.tierName}</span>
                          </span>
                          <span className="text-[9px] font-mono text-[var(--text-muted)] font-bold">
                            Tebal {tierStyle.borderThicknessPx}px · {tierStyle.metalLabel}
                          </span>
                        </div>
                      </div>

                      <h4 className="font-bold text-xs sm:text-sm font-display text-[var(--text-main)]">
                        {branch.name}
                      </h4>
                      <p className="text-[11px] text-[var(--text-muted)] line-clamp-1 mt-0.5">
                        {branch.description}
                      </p>
                    </div>

                    <div className="pt-2.5 mt-2.5 border-t border-[var(--border-main)]/50 space-y-1.5 relative z-10">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-[var(--text-muted)]">Progres</span>
                        <span className="font-bold text-[var(--text-main)] font-mono">{currentCount} / {progressInfo.targetCount} {branch.unit}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div 
                          className={`h-full rounded-full bg-gradient-to-r ${tierStyle.progressBarGradient}`}
                          style={{ width: `${progressInfo.progressPercent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] pt-0.5">
                        <span className="text-[var(--text-muted)]">Gelar:</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400 truncate max-w-[140px]">
                          [{progressInfo.currentTier?.titleReward}]
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5 text-center space-y-2">
                <Sparkles className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-sm font-bold text-[var(--text-main)]">Belum Ada Medali Yang Terbuka</p>
                <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
                  Lakukan inspeksi, laporkan KTA, buat tema, atau ikuti briefing P5M untuk membuka achievement kelas Bronze, Silver, Gold, hingga Master!
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    onBack();
                    window.dispatchEvent(new CustomEvent('navigate-tab', { detail: { tab: 'leaderboard' } }));
                  }}
                  className="mt-2 text-xs font-bold cursor-pointer"
                >
                  Jelajahi 12 Cabang Achievement
                </Button>
              </div>
            )}
          </Card>

          {profile && (
            <div className="space-y-4">
              {/* Card Informasi Pekerjaan */}
              <Card 
                className="p-5 shadow-xs space-y-4 border"
                style={{
                  backgroundColor: 'var(--card-bg, #FFFFFF)',
                  borderColor: 'var(--border-main, #E2E8F0)'
                }}
              >
                <h3 
                  className="font-bold text-sm flex items-center gap-2 border-b pb-3"
                  style={{
                    color: 'var(--text-main, #1E293B)',
                    borderColor: 'var(--border-main, #E2E8F0)'
                  }}
                >
                  <UserCircle2 className="w-4 h-4" style={{ color: 'var(--primary, #2A9D8F)' }} />
                  Informasi Pekerjaan
                </h3>
                <div className="space-y-3.5 pt-1">
                  <InfoItem icon={<Briefcase />} label="Jabatan" value={profile.jabatan} />
                  <InfoItem icon={<Users />} label="Section" value={profile.section} />
                  <InfoItem icon={<Building />} label="Perusahaan" value={profile.pt} />
                  <InfoItem icon={<Hash />} label="Job Grade / Gol" value={profile.jobGrade && profile.gol ? `${profile.jobGrade} / ${profile.gol}` : (profile.jobGrade || profile.gol)} />
                  <InfoItem icon={<MapPin />} label="Point of Hire (POH)" value={profile.poh} />
                </div>
              </Card>

              {/* Card Informasi Cuti & Roster */}
              <Card 
                className="p-5 shadow-xs flex flex-col border"
                style={{
                  backgroundColor: 'var(--card-bg, #FFFFFF)',
                  borderColor: 'var(--border-main, #E2E8F0)'
                }}
              >
                <h3 
                  className="font-bold text-sm flex items-center gap-2 border-b pb-3 mb-4"
                  style={{
                    color: 'var(--text-main, #1E293B)',
                    borderColor: 'var(--border-main, #E2E8F0)'
                  }}
                >
                  <Plane className="w-4 h-4" style={{ color: 'var(--primary, #2A9D8F)' }} />
                  Informasi Cuti & Roster
                </h3>
                
                <div className="flex-1 flex flex-col gap-3.5">
                  {loadingRoster ? (
                    <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                       <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }}></div>
                       <p className="text-xs font-semibold">Memuat data roster...</p>
                    </div>
                  ) : cutiInfo ? (
                    <>
                      {/* Box Kuota Cuti (Google Sheets Sync CutiTahunan) */}
                      <div 
                        className="p-4 rounded-xl border space-y-3"
                        style={{
                          backgroundColor: 'var(--input-bg, #F8FAFC)',
                          borderColor: 'var(--border-main, #E2E8F0)'
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] sm:text-[11px] uppercase font-extrabold tracking-wider flex items-center gap-1.5" style={{ color: 'var(--primary, #2A9D8F)' }}>
                            <Plane className="w-3.5 h-3.5" />
                            Sisa CT & Jatuh Tempo Cuti Tahunan
                          </p>
                          <span 
                            className="text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border shrink-0 shadow-2xs"
                            style={{
                              backgroundColor: 'var(--card-bg, #FFFFFF)',
                              borderColor: 'var(--border-main, #E2E8F0)',
                              color: 'var(--primary, #2A9D8F)'
                            }}
                          >
                            Database Roster Sync
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                          <div 
                            className="p-3.5 rounded-xl border shadow-2xs"
                            style={{
                              backgroundColor: 'var(--card-bg, #FFFFFF)',
                              borderColor: 'var(--border-main, #E2E8F0)'
                            }}
                          >
                            <span className="text-[10px] font-extrabold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted, #64748B)' }}>
                              Sisa Cuti Tahunan (CT)
                            </span>
                            <p className="text-xl sm:text-2xl font-black font-display" style={{ color: 'var(--primary, #2A9D8F)' }}>
                              {profile?.sisaCt || myRosterData?.sisa_ct || myRosterData?.sisaCt || '0'} <span className="text-xs font-bold" style={{ color: 'var(--text-muted, #64748B)' }}>hari</span>
                            </p>
                          </div>

                          <div 
                            className="p-3.5 rounded-xl border shadow-2xs"
                            style={{
                              backgroundColor: 'var(--card-bg, #FFFFFF)',
                              borderColor: 'var(--border-main, #E2E8F0)'
                            }}
                          >
                            <span className="text-[10px] font-extrabold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted, #64748B)' }}>
                              Jatuh Tempo CT
                            </span>
                            <p className="text-sm sm:text-base font-black" style={{ color: 'var(--text-main, #1E293B)' }}>
                              {profile?.jatuhTempoCt || myRosterData?.jatuh_tempo_ct || myRosterData?.jatuhTempoCt || '-'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Box Jadwal Cuti Berikutnya */}
                      <div 
                        className="p-4 rounded-xl border space-y-2"
                        style={{
                          backgroundColor: 'var(--input-bg, #F0FDF4)',
                          borderColor: 'var(--border-main, #BBF7D0)'
                        }}
                      >
                        <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--primary, #2A9D8F)' }}>
                          Jadwal Cuti Berikutnya
                        </p>
                        {cutiInfo.actualCuti ? (
                           <div>
                              <p className="text-base sm:text-lg font-bold" style={{ color: 'var(--text-main, #1E293B)' }}>
                                 {cutiInfo.actualCuti.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                 <span 
                                   className="px-2.5 py-1 rounded-md text-xs font-bold shadow-2xs border"
                                   style={{
                                     backgroundColor: 'var(--card-bg, #FFFFFF)',
                                     borderColor: 'var(--border-main, #E2E8F0)',
                                     color: 'var(--primary, #2A9D8F)'
                                   }}
                                 >
                                    {cutiInfo.daysRemaining >= 0 ? `Sisa ${cutiInfo.daysRemaining} hari lagi` : `Telah lewat ${Math.abs(cutiInfo.daysRemaining)} hari`}
                                 </span>
                                 {cutiInfo.difference !== 0 && (
                                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold shadow-2xs border ${cutiInfo.difference > 0 ? 'bg-rose-500/10 text-rose-600 border-rose-500/30' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'}`}>
                                       {cutiInfo.difference > 0 ? `Mundur ${cutiInfo.difference} hari` : `Maju ${Math.abs(cutiInfo.difference)} hari`}
                                    </span>
                                 )}
                              </div>
                              {!cutiInfo.hasTrv && (
                                 <p className="text-[10px] opacity-70 mt-2 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                                    <Info className="w-3.5 h-3.5 shrink-0" /> Berdasarkan estimasi rotasi kerja
                                 </p>
                              )}
                              {cutiInfo.hasTrv && (
                                 <p className="text-[10px] opacity-70 mt-2 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                                    <Info className="w-3.5 h-3.5 shrink-0" /> Telah dijadwalkan oleh admin (Fixed TRV/TV)
                                 </p>
                              )}
                           </div>
                        ) : (
                           <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                             Belum ada jadwal cuti aktif tercatat di sistem TRV/TV.
                           </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div 
                      className="p-4 rounded-xl border text-center space-y-1.5"
                      style={{
                        backgroundColor: 'var(--input-bg, #F8FAFC)',
                        borderColor: 'var(--border-main, #E2E8F0)'
                      }}
                    >
                      <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                        Data Roster Belum Tersinkronisasi
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        Jadwal rotasi dan cuti Anda belum diatur pada Master Roster TRV/TV admin.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      </motion.div>

      {/* Username Setup / Edit Modal */}
      <UsernamePromptModal 
        isOpen={showUsernameModal}
        onClose={() => setShowUsernameModal(false)}
        nik={inspectorNik || ''}
        currentUsername={profile?.username}
        fullName={inspectorName || ''}
        onUsernameUpdated={(newU) => {
          setProfile((p: any) => ({ ...p, username: newU }));
          window.dispatchEvent(new Event('profile_updated'));
        }}
      />

      {/* Background / Cover Wallpaper Customization Modal */}
      {showCoverModal && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
          onClick={() => setShowCoverModal(false)}
        >
          <div 
            className="w-full max-w-lg rounded-3xl shadow-2xl border flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150"
            style={{
              backgroundColor: 'var(--card-bg, #FFFFFF)',
              borderColor: 'var(--border-main, #E2E8F0)',
              color: 'var(--text-main, #1E293B)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div 
              className="p-4 border-b flex items-center justify-between shrink-0"
              style={{
                backgroundColor: 'var(--bg-main, #F8FAFC)',
                borderColor: 'var(--border-main, #E2E8F0)'
              }}
            >
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white shadow-xs"
                  style={{ backgroundColor: 'var(--primary, #0D9488)' }}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base font-display">
                    Background Profil
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted, #64748B)' }}>
                    Pasang foto atau wallpaper estetik di belakang foto profil
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowCoverModal(false)}
                className="p-2 rounded-full border shadow-2xs hover:opacity-80 active:scale-95 transition-all cursor-pointer"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border-main)'
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Scrollable Content */}
            <div className="p-5 overflow-y-auto space-y-6 flex-1">
              {/* Live Preview Box */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: 'var(--text-muted)' }}>
                  Pratinjau Tampilan Profil
                </label>
                <div 
                  className="rounded-2xl border overflow-hidden shadow-inner relative"
                  style={{ borderColor: 'var(--border-main)' }}
                >
                  <div 
                    className="h-24 sm:h-28 relative flex items-end p-3 transition-all duration-300"
                    style={{
                      background: cover 
                        ? (cover.startsWith('linear-gradient') ? cover : `url(${cover}) center / cover no-repeat`) 
                        : 'linear-gradient(to right, var(--primary, #0D9488), var(--primary-hover, #0F766E), var(--accent, #14B8A6))'
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                    
                    <div className="relative z-10 flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-xl p-0.5 shadow-md border overflow-hidden bg-white shrink-0"
                        style={{ borderColor: 'var(--border-main)' }}
                      >
                        {avatar ? (
                          <img src={avatar} alt="Avatar" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <div className="w-full h-full rounded-lg bg-teal-500/20 text-teal-600 flex items-center justify-center font-bold text-sm">
                            {initials}
                          </div>
                        )}
                      </div>
                      <div className="text-white drop-shadow-md">
                        <p className="text-sm font-black leading-tight">{profile?.username || inspectorName || 'Nama Personil'}</p>
                        <p className="text-[10px] opacity-80 font-medium">{profile?.jabatan || 'Preparation & Laboratory'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action 1: Upload Custom Photo */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                  Unggah Foto Sendiri
                </label>
                <button
                  type="button"
                  onClick={() => coverFileInputRef.current?.click()}
                  disabled={isUploadingCover}
                  className="w-full py-3 px-4 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2.5 font-semibold text-xs sm:text-sm transition-all active:scale-98 cursor-pointer hover:border-teal-500"
                  style={{
                    backgroundColor: 'var(--input-bg, #F8FAFC)',
                    borderColor: 'var(--border-main, #CBD5E1)',
                    color: 'var(--primary, #0D9488)'
                  }}
                >
                  <Upload className="w-4 h-4 animate-bounce" />
                  <span>{isUploadingCover ? 'Mengompresi Gambar...' : 'Pilih Foto Wallpaper dari Galeri / Kamera'}</span>
                </button>
              </div>

              {/* Action 2: Preset Wallpapers */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                  Pilihan Background Estetik Siap Pakai
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {PRESET_PROFILE_COVERS.map(p => {
                    const isSelected = cover === p.gradient;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSetPresetCover(p.gradient)}
                        className={`h-20 rounded-2xl p-2.5 text-left flex flex-col justify-between border-2 transition-all relative overflow-hidden group shadow-sm active:scale-95 cursor-pointer ${
                          isSelected ? 'ring-2 ring-teal-500 border-teal-500 scale-[1.02]' : 'border-transparent hover:scale-[1.02]'
                        }`}
                        style={{ background: p.gradient }}
                      >
                        <div className="flex justify-between items-center text-white">
                          <span className="text-[11px] font-bold drop-shadow-md truncate">{p.name}</span>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-white text-teal-600 flex items-center justify-center font-bold text-[9px] shadow-sm">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] text-white/80 font-medium drop-shadow-xs truncate">
                          {p.vibe}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action 3: Reset to Default Theme */}
              {cover && (
                <div className="pt-2 border-t" style={{ borderColor: 'var(--border-main)' }}>
                  <button
                    type="button"
                    onClick={handleRemoveCover}
                    className="w-full py-2.5 px-4 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    style={{ borderColor: 'var(--border-main)' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Background (Kembali ke Gradien Tema Bawaan)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div 
              className="p-3.5 border-t flex justify-end shrink-0"
              style={{
                backgroundColor: 'var(--bg-main, #F8FAFC)',
                borderColor: 'var(--border-main, #E2E8F0)'
              }}
            >
              <Button
                onClick={() => setShowCoverModal(false)}
                variant="secondary"
                className="!w-auto text-xs px-5 py-2"
              >
                Selesai
              </Button>
            </div>
          </div>
        </div>
      )}

      <PixelAvatarModal
        isOpen={isPixelAvatarOpen}
        onClose={() => setIsPixelAvatarOpen(false)}
        onSave={(newAvatarDataUrl) => setAvatar(newAvatarDataUrl)}
        currentNik={inspectorNik}
        currentName={inspectorName}
      />

      <PromotionWelcomeModal
        isOpen={showPromotionModal}
        onClose={() => setShowPromotionModal(false)}
        currentUserNik={inspectorNik || undefined}
        currentUserName={inspectorName || undefined}
        userAvatar={avatar}
        forceShow={showPromotionModal}
      />

      <ExpAuditModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        currentNik={inspectorNik}
        currentName={inspectorName}
        leaderboardList={profileLeaderboard}
        initialTargetNik={inspectorNik}
        userGamification={gamificationData}
      />
    </>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | undefined | null }) {
  return (
    <div className="flex items-start gap-3">
      <div 
        className="p-2 rounded-xl shrink-0 border shadow-2xs flex items-center justify-center"
        style={{
          backgroundColor: 'var(--input-bg, #F8FAFC)',
          borderColor: 'var(--border-main, #E2E8F0)',
          color: 'var(--primary, #2A9D8F)'
        }}
      >
         {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4' } as any)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider font-bold mb-0.5" style={{ color: 'var(--text-muted, #64748B)' }}>
          {label}
        </p>
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-main, #1E293B)' }}>
          {value || '-'}
        </p>
      </div>
    </div>
  );
}
