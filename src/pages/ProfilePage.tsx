import React, { useEffect, useState, useRef } from 'react';
import { Card, Button } from '../components/ui';
import { LogOut, Briefcase, MapPin, Building, Hash, CalendarIcon, Users, UserCircle2, ArrowLeft, Plane, Info, X, Camera, Trash2, Image as ImageIcon, Calendar } from 'lucide-react';
import { getRosterData } from '../sheets-api';
import { motion, useDragControls } from 'motion/react';
import { toast } from 'sonner';
import { UsernamePromptModal } from '../components/UsernamePromptModal';

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

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const dragControls = useDragControls();

  // Load avatar from localStorage or backend if not yet in state
  useEffect(() => {
    if (inspectorNik) {
      const cached = localStorage.getItem(`p2h_inspector_avatar_${inspectorNik}`);
      if (cached && !avatar) {
        setAvatar(cached);
      }
      // Also fetch fresh from backend
      fetch(`/api/employees/${encodeURIComponent(inspectorNik)}`)
        .then(res => res.json())
        .then(emp => {
          if (emp?.avatar) {
            setAvatar(emp.avatar);
            localStorage.setItem(`p2h_inspector_avatar_${inspectorNik}`, emp.avatar);
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
          {/* Hidden File Input */}
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            onChange={handleImageSelect} 
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
            {/* Top Banner Gradient */}
            <div 
              className="h-28 sm:h-32 bg-gradient-to-r"
              style={{
                backgroundImage: 'linear-gradient(to right, var(--primary, #0D9488), var(--primary-hover, #0F766E), var(--accent, #14B8A6))'
              }}
            />
            <div className="px-5 pb-5 relative">
              <div className="flex justify-between items-end -mt-10 sm:-mt-12 mb-4">
                {/* Avatar Box with Edit Badge */}
                <div className="relative group">
                  <div 
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl p-1 shadow-md relative overflow-hidden border"
                    style={{
                      backgroundColor: 'var(--card-bg, #FFFFFF)',
                      borderColor: 'var(--border-main, #E2E8F0)'
                    }}
                  >
                    {avatar ? (
                      <img 
                        src={avatar} 
                        alt={inspectorName || 'Foto Profil'} 
                        className="w-full h-full rounded-xl object-cover"
                      />
                    ) : (
                      <div 
                        className="w-full h-full rounded-xl flex items-center justify-center text-2xl sm:text-3xl font-bold font-display border"
                        style={{
                          backgroundColor: 'var(--input-bg, rgba(42, 157, 143, 0.1))',
                          borderColor: 'var(--border-main, #E2E8F0)',
                          color: 'var(--primary, #2A9D8F)'
                        }}
                      >
                        {initials}
                      </div>
                    )}

                    {isUploading && (
                      <div className="absolute inset-0 bg-black/70 rounded-xl flex flex-col items-center justify-center text-white p-1">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mb-1" />
                        <span className="text-[9px] font-medium">Kompresi...</span>
                      </div>
                    )}
                  </div>

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

                <div className="flex items-center gap-2">
                  <Button 
                    onClick={onLogout} 
                    variant="danger" 
                    className="rounded-xl flex items-center gap-2 px-3.5 sm:px-4 shadow-sm h-9 sm:h-10 text-xs sm:text-sm cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" /> 
                    <span>Keluar Sesi</span>
                  </Button>
                </div>
              </div>
              
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-display font-bold" style={{ color: 'var(--text-main, #1E293B)' }}>
                      {inspectorName}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span 
                        className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md border flex items-center gap-1"
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
                        className="text-xs font-bold underline flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ color: 'var(--primary, #2A9D8F)' }}
                      >
                        Ubah Panggilan
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span 
                    className="px-2.5 py-1 rounded-md text-xs font-mono font-medium border"
                    style={{
                      backgroundColor: 'var(--input-bg, #F1F5F9)',
                      borderColor: 'var(--border-main, #E2E8F0)',
                      color: 'var(--text-main, #1E293B)'
                    }}
                  >
                    NIK: {inspectorNik || '-'}
                  </span>
                  <div 
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border"
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      borderColor: 'rgba(16, 185, 129, 0.3)',
                      color: '#10B981'
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Active
                  </div>
                </div>
              </div>
            </div>
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
                      {/* Box Kuota Cuti */}
                      <div 
                        className="p-4 rounded-xl border space-y-2"
                        style={{
                          backgroundColor: 'var(--input-bg, #F8FAFC)',
                          borderColor: 'var(--border-main, #E2E8F0)'
                        }}
                      >
                        <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted, #64748B)' }}>
                           {cutiInfo.isYear5 ? 'Kuota Cuti Istimewa (CI)' : 'Kuota Cuti Tahunan (CT)'}
                        </p>
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-2xl sm:text-3xl font-black font-display" style={{ color: 'var(--text-main, #1E293B)' }}>
                              {cutiInfo.remaining} <span className="text-xs sm:text-sm font-semibold opacity-70">hari</span>
                            </p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted, #64748B)' }}>
                              Dari total kuota {cutiInfo.totalKuota} hari
                            </p>
                          </div>
                          <div className="text-right">
                             <p className="text-xs font-bold text-rose-500">
                               Terpakai: {cutiInfo.totalUsed} hari
                             </p>
                             {cutiInfo.izinUsed > 0 && (
                               <p className="text-[10px] text-amber-500 font-semibold mt-0.5">
                                 Termasuk {cutiInfo.izinUsed} hari Izin
                               </p>
                             )}
                             {cutiInfo.joinDate && (
                               <p className="text-[10px] opacity-60 font-mono mt-1" style={{ color: 'var(--text-muted)' }}>
                                 Sejak {cutiInfo.joinDate.toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}
                               </p>
                             )}
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
