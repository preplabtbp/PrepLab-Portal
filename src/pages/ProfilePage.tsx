import React, { useEffect, useState, useRef } from 'react';
import { Card, Button } from '../components/ui';
import { LogOut, Briefcase, MapPin, Building, Hash, CalendarIcon, Users, UserCircle2, ArrowLeft, Plane, Info, X, Camera, Trash2, Image as ImageIcon } from 'lucide-react';
import { getRosterData } from '../sheets-api';
import { motion, useDragControls } from 'motion/react';
import { toast } from 'sonner';

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
          } catch (err) {
            console.error('Database avatar sync failed', err);
          }

          setIsUploading(false);
          toast.success(`Foto profil diperbarui! (${origKb} KB → ${compKb} KB)`, { id: 'avatar-upload' });
        } catch (err: any) {
          setIsUploading(false);
          toast.error('Gagal mengompresi gambar: ' + err.message, { id: 'avatar-upload' });
        }
      };

      img.onerror = () => {
        setIsUploading(false);
        toast.error('Gagal membaca gambar', { id: 'avatar-upload' });
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      setIsUploading(false);
      toast.error('Gagal membaca file', { id: 'avatar-upload' });
    };

    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = async () => {
    if (!confirm('Hapus foto profil kustom?')) return;

    setAvatar(null);
    if (profile) {
      const updatedProfile = { ...profile, avatar: null };
      setProfile(updatedProfile);
      localStorage.setItem('p2h_inspector_profile', JSON.stringify(updatedProfile));
    }

    if (inspectorNik) {
      localStorage.removeItem(`p2h_inspector_avatar_${inspectorNik}`);
      try {
        await fetch('/api/employees/avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nik: inspectorNik, avatar: null }),
        });
      } catch (e) {}
    }

    window.dispatchEvent(new Event('profile_updated'));
    toast.success('Foto profil telah dihapus');
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (inspectorNik) {
      const fetchRoster = async () => {
        try {
          const cacheKey = `roster_${inspectorNik}`;
          const cached = localStorage.getItem(cacheKey);
          const todayDateStr = new Date().toDateString();
          
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.date === todayDateStr) {
              setMyRosterData(parsed.data);
              return;
            }
          }

          const res = await getRosterData(inspectorNik);
          if (res.success && res.roster) { 
             const myRoster = res.roster.find((r: any) => r.nik === inspectorNik);
             if (myRoster) {
                 setMyRosterData(myRoster);
                 localStorage.setItem(cacheKey, JSON.stringify({
                   data: myRoster,
                   date: todayDateStr
                 }));
             }
          }
        } catch(e) {}
      };
      fetchRoster();
    }
  }, [inspectorNik]);

  const initials = inspectorName 
    ? inspectorName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
    : '?';

  const calculateCuti = () => {
    if (!myRosterData || !profile) return null;
    
    const EXCLUDED_NAMES_FOR_LEAVE = [
      "Nyong Dokolamo", "Roy Marten Bobrikit", "La Sapiu", "Natanel Tooli", "Khaufi Wirawan Aligora", 
      "Deni Nugraha Perdiana", "Darno La Bungahari", "Rusli Rorano", "Arsun Lantia", "Mhd. Dahlan Ahmad", 
      "Karlos Yafet", "Murti Tamisari Harun", "Christian Anggawijaya", "Arthur Paul Marnix Souisa", 
      "Moch. Siswanto", "Zaenal Abidin", "Sirajuddin", "Madraji", "Janter Jaya Barimbing", 
      "Sumarlin Muhammad", "La Alwino La Ode Pudu", "La Topo", "Daud Kedafota", "Wahyu Jabir", 
      "Jarfin Saharudin", "Sukri Koco", "Yulianus Tiku Mangando", "La Ode Dendi", "Saman Dokulamo", 
      "Sukarman A. Akil, ST", "Muhammad Amran Selang", "Hariyatno La Jaya", "Harji La Ila", 
      "La Ode Hartanto", "Iran Rumbia", "La Rifan", "Suryadi La Samusu", "Fajrin Muin", 
      "Rifandi Samsudin", "Ahmad Sudirman", "Ramadan Muhamad", "Dulmihdat Tomayou", 
      "Ahmad Jusma Azhari Annur", "La Bayu", "Ardila Rusli", "Muslim Wabula", "Aldy Aldersun Puluh", 
      "Rizal Zaelani", "Herwin Predianto", "Muhammad Fandy Septiawan", "Imran S", "Muhamad Alvin Febriansyah"
    ];

    let joinDateStr = profile.tanggalAwalBergabung;
    if (EXCLUDED_NAMES_FOR_LEAVE.includes(profile.name) && profile.tanggalBergabungTerbaru && profile.tanggalBergabungTerbaru !== '-') {
      joinDateStr = profile.tanggalBergabungTerbaru;
    }

    const joinDate = parseStringDate(joinDateStr);
    const today = new Date();
    today.setHours(0,0,0,0);

    let ctKuota = 0;
    let ctUsed = 0;
    let ciKuota = 0;
    let ciUsed = 0;
    let izinUsed = 0;
    let isYear5 = false;
    let anniversaryDate = new Date();

    if (joinDate) {
      const currentYear = today.getFullYear();
      let diffYears = currentYear - joinDate.getFullYear();
      
      anniversaryDate = new Date(joinDate);
      anniversaryDate.setFullYear(currentYear);
      
      if (anniversaryDate > today) {
        anniversaryDate.setFullYear(currentYear - 1);
        diffYears--;
      }
      
      if (diffYears >= 1) {
         if (diffYears % 5 === 0 && diffYears > 0) {
            isYear5 = true;
            ciKuota = 30;
         } else {
            ctKuota = 12;
         }
      }
    }

    const sched = myRosterData.fullSchedule || {};
    Object.keys(sched).forEach(dateStr => {
      const d = parseStringDate(dateStr);
      if (d && d >= anniversaryDate && d <= today) {
         const status = sched[dateStr];
         if (status) {
           if (status.startsWith('CT')) {
             ctUsed++;
           } else if (status.startsWith('CI')) {
             ciUsed++;
           } else if (status === 'I' || /^I\d+$/.test(status)) {
             izinUsed++;
           }
         }
      }
    });

    let weeksOn = 8;
    const g = (profile.gol || '').toUpperCase();
    const jg = (profile.jobGrade || '').toUpperCase();
    if (jg === 'S2') weeksOn = 10;
    else if (g === 'I' || g === '1') weeksOn = 10;
    else if (g === 'IV' || g === '4' || g.includes('IV')) weeksOn = 7;
    else if (g === 'V' || g === '5' || g.includes('V')) weeksOn = 6;
    const rosterDays = weeksOn * 7;

    const lastTrv = parseStringDate(myRosterData.lastTrvDate);
    let estimatedNextLeave = null;
    if (lastTrv) {
      estimatedNextLeave = new Date(lastTrv);
      estimatedNextLeave.setDate(estimatedNextLeave.getDate() + 1 + rosterDays);
    }

    let futureTrv = null;
    const sortedDates = Object.keys(sched).sort((a,b) => parseStringDate(a)!.getTime() - parseStringDate(b)!.getTime());
    for (const dateStr of sortedDates) {
      const d = parseStringDate(dateStr);
      if (d && d > today && (['TRV', 'TV', 'C', 'CR', 'CE', 'CT', 'CI', 'XP', 'TT'].includes(sched[dateStr]) || (sched[dateStr] && (sched[dateStr].startsWith('CT') || sched[dateStr].startsWith('CE'))))) {
        futureTrv = d;
        break;
      }
    }

    let actualCuti = futureTrv || estimatedNextLeave;
    let difference = 0;
    if (futureTrv && estimatedNextLeave) {
      difference = Math.floor((futureTrv.getTime() - estimatedNextLeave.getTime()) / (1000 * 3600 * 24));
    }

    let daysRemaining = 0;
    if (actualCuti) {
      daysRemaining = Math.floor((actualCuti.getTime() - today.getTime()) / (1000 * 3600 * 24));
    }

    const totalKuota = isYear5 ? ciKuota : ctKuota;
    const totalUsed = ctUsed + ciUsed + izinUsed;
    const remaining = Math.max(0, totalKuota - totalUsed);

    return {
      ctKuota,
      ctUsed,
      ciKuota,
      ciUsed,
      izinUsed,
      isYear5,
      totalKuota,
      totalUsed,
      remaining,
      actualCuti,
      difference,
      daysRemaining,
      hasTrv: !!futureTrv,
      joinDate
    };
  };

  const dragControls = useDragControls();
  const cutiInfo = calculateCuti();

  return (
    <>
      {/* Mobile & Desktop Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="fixed inset-0 z-[50] bg-slate-900/40 backdrop-blur-md cursor-pointer" 
        onClick={onBack} 
      />
      
      {/* Profile Drawer Sheet */}
      <motion.div 
        initial={isMobile ? { y: '100%' } : { x: '100%' }}
        animate={isMobile ? { y: 0 } : { x: 0 }}
        exit={isMobile ? { y: '100%' } : { x: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 350, mass: 0.8 }}
        drag={isMobile ? 'y' : false}
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.05, bottom: 0.5 }}
        onDragEnd={(_e, info) => {
          if (info.offset.y > 100 || info.velocity.y > 400) {
            onBack();
          }
        }}
        className="fixed inset-x-0 bottom-0 top-10 md:top-0 md:left-auto md:right-0 z-[60] w-full md:w-[420px] lg:w-[480px] h-[calc(100dvh-2.5rem)] md:h-full bg-slate-50 rounded-t-[28px] md:rounded-none shadow-2xl md:border-l md:border-slate-200/80 flex flex-col overflow-hidden"
      >
        {/* Mobile Pull Indicator Handle */}
        <div 
          className="w-full flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing shrink-0 md:hidden touch-none"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <div className="w-12 h-1.5 bg-slate-300 hover:bg-slate-400 rounded-full transition-colors" />
        </div>

        {/* Header Bar */}
        <div 
          className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between border-b border-slate-200/70 shrink-0 select-none"
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest('button')) return;
            if (isMobile) dragControls.start(e);
          }}
        >
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack} 
              className="p-2 -ml-2 rounded-full hover:bg-slate-200/70 bg-slate-200/40 text-slate-700 transition-colors shadow-xs active:scale-95"
              aria-label="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg sm:text-xl font-display font-bold text-slate-800 leading-tight">Profil Karyawan</h1>
              <p className="text-[11px] text-slate-500 font-medium">Preparation & Laboratory Departement</p>
            </div>
          </div>
          <button 
            onClick={onBack} 
            className="p-1.5 rounded-full hover:bg-slate-200/70 text-slate-500 transition-colors md:hidden"
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

          <Card className="overflow-hidden border-0 shadow-lg bg-white relative">
            <div className="h-28 sm:h-32 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700"></div>
            <div className="px-5 pb-5 relative">
              <div className="flex justify-between items-end -mt-10 sm:-mt-12 mb-4">
                {/* Avatar Box with Edit Badge */}
                <div className="relative group">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white p-1 shadow-md relative overflow-hidden">
                    {avatar ? (
                      <img 
                        src={avatar} 
                        alt={inspectorName || 'Foto Profil'} 
                        className="w-full h-full rounded-xl object-cover border border-slate-100"
                      />
                    ) : (
                      <div className="w-full h-full rounded-xl bg-teal-50 flex items-center justify-center text-teal-700 text-2xl sm:text-3xl font-bold font-display border border-teal-100">
                        {initials}
                      </div>
                    )}

                    {isUploading && (
                      <div className="absolute inset-0 bg-slate-900/60 rounded-xl flex flex-col items-center justify-center text-white p-1">
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
                    className="absolute -bottom-1 -right-1 p-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-md transition-all active:scale-90 border-2 border-white flex items-center justify-center group-hover:scale-105"
                    title="Ganti Foto Profil"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Button onClick={onLogout} variant="danger" className="rounded-xl flex items-center gap-2 px-3.5 sm:px-4 shadow-sm h-9 sm:h-10 text-xs sm:text-sm">
                    <LogOut className="w-4 h-4" /> 
                    <span>Keluar Sesi</span>
                  </Button>
                </div>
              </div>
              
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-800">{inspectorName}</h2>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-mono font-medium border border-slate-200">
                    NIK: {inspectorNik || '-'}
                  </span>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-md text-xs font-semibold border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Active
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {profile && (
            <div className="space-y-4">
              <Card className="p-5 border-slate-100 shadow-xs bg-white space-y-4">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <UserCircle2 className="w-4 h-4 text-teal-600" />
                  Informasi Pekerjaan
                </h3>
                <div className="space-y-4 pt-1">
                  <InfoItem icon={<Briefcase />} label="Jabatan" value={profile.jabatan} />
                  <InfoItem icon={<Users />} label="Section" value={profile.section} />
                  <InfoItem icon={<Building />} label="Perusahaan" value={profile.pt} />
                  <InfoItem icon={<Hash />} label="Job Grade / Gol" value={profile.jobGrade && profile.gol ? `${profile.jobGrade} / ${profile.gol}` : (profile.jobGrade || profile.gol)} />
                  <InfoItem icon={<MapPin />} label="Point of Hire (POH)" value={profile.poh} />
                </div>
              </Card>

              <Card className="p-5 border-slate-100 shadow-xs bg-white flex flex-col">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <Plane className="w-4 h-4 text-teal-600" />
                  Informasi Cuti & Roster
                </h3>
                
                <div className="flex-1 flex flex-col gap-4">
                  {cutiInfo ? (
                    <>
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">
                           {cutiInfo.isYear5 ? 'Kuota Cuti Istimewa (CI)' : 'Kuota Cuti Tahunan (CT)'}
                        </p>
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-2xl font-black text-slate-800">{cutiInfo.remaining} <span className="text-sm font-semibold text-slate-500">hari</span></p>
                            <p className="text-xs text-slate-500 mt-0.5">Dari total kuota {cutiInfo.totalKuota} hari</p>
                          </div>
                          <div className="text-right">
                             <p className="text-xs font-semibold text-rose-600">Terpakai: {cutiInfo.totalUsed} hari</p>
                             {cutiInfo.izinUsed > 0 && <p className="text-[10px] text-orange-500 mt-0.5">Termasuk {cutiInfo.izinUsed} hari Izin</p>}
                             {cutiInfo.joinDate && <p className="text-[10px] text-slate-400 mt-1">Sejak {cutiInfo.joinDate.toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}</p>}
                          </div>
                        </div>
                      </div>

                      <div className="bg-teal-50 p-3.5 rounded-xl border border-teal-100">
                        <p className="text-[10px] uppercase font-bold text-teal-600 mb-1">Jadwal Cuti Berikutnya</p>
                        {cutiInfo.actualCuti ? (
                           <div>
                              <p className="text-base sm:text-lg font-bold text-teal-900 mb-1">
                                 {cutiInfo.actualCuti.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                 <span className="px-2 py-1 bg-white text-teal-700 rounded text-xs font-bold shadow-2xs">
                                    {cutiInfo.daysRemaining >= 0 ? `Sisa ${cutiInfo.daysRemaining} hari lagi` : `Telah lewat ${Math.abs(cutiInfo.daysRemaining)} hari`}
                                 </span>
                                 {cutiInfo.difference !== 0 && (
                                    <span className={`px-2 py-1 rounded text-xs font-bold shadow-2xs ${cutiInfo.difference > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                       {cutiInfo.difference > 0 ? `Mundur ${cutiInfo.difference} hari` : `Maju ${Math.abs(cutiInfo.difference)} hari`}
                                    </span>
                                 )}
                              </div>
                              {!cutiInfo.hasTrv && (
                                 <p className="text-[10px] text-teal-600/80 mt-2 flex items-center gap-1">
                                    <Info className="w-3 h-3 shrink-0" /> Berdasarkan perhitungan rotasi jadwal
                                 </p>
                              )}
                              {cutiInfo.hasTrv && (
                                 <p className="text-[10px] text-teal-600/80 mt-2 flex items-center gap-1">
                                    <Info className="w-3 h-3 shrink-0" /> Telah dijadwalkan oleh admin (Fixed TRV/TV)
                                 </p>
                              )}
                           </div>
                        ) : (
                           <p className="text-sm text-teal-700">Belum ada estimasi jadwal cuti (Riwayat TRV/TV tidak ditemukan)</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                       <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin mx-auto mb-3"></div>
                       <p className="text-sm">Memuat data roster...</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | undefined | null }) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 bg-slate-50 text-slate-400 rounded-lg shrink-0">
         {React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4' } as any)}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-0.5">{label}</p>
        <p className="text-sm font-medium text-slate-800">{value || '-'}</p>
      </div>
    </div>
  );
}
