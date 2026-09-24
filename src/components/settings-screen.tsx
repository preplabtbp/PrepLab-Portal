import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from './ui';
import { LogOut, User, Lock, Mail, Settings2, Palette, ShieldAlert, Settings, Bell, Sparkles, MessageSquarePlus, Type, Smartphone, Check, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';
import { getAppSettings } from '../sheets-api';
import { PageHeader } from './PageHeader';
import { FONT_SIZE_OPTIONS, FontSizeOption, applyFontSize, getStoredFontSize } from '../utils/fontSize';
import { useMobileMode } from '../utils/mobileMode';

export function SettingsScreen({ 
  inspectorName, 
  inspectorNik, 
  onLogoutKaryawan, 
  onOpenThemeModal,
  onNav 
}: { 
  inspectorName: string | null; 
  inspectorNik: string | null; 
  onLogoutKaryawan: () => void; 
  onOpenThemeModal: () => void;
  onNav?: (tab: string) => void;
}) {
  const [profile, setProfile] = useState<any>(null);
  const [activeFontSize, setActiveFontSize] = useState<FontSizeOption>(() => getStoredFontSize());
  const { mode: mobileMode, setMobileMode } = useMobileMode();
  
  const [email, setEmail] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('p2h_sound_enabled') !== '0';
  });
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // Admin only
  const [resetNik, setResetNik] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [waTarget, setWaTarget] = useState('');

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem('p2h_inspector_profile') || '{}');
      setProfile(p);
      setEmail(p.email || '');
    } catch(e) {}
    
    if (inspectorNik === '02D250000') {
       getAppSettings().then(res => {
          if (res && res.success && res.data) {
             const found = res.data.find((s: any) => s.settingKey === 'WA_TARGET_NUMBER');
             if (found) setWaTarget(found.settingValue);
          }
       }).catch(e => console.error(e));
    }
  }, [inspectorNik]);

  const handleUpdatePassword = async () => {
    if (!oldPassword || !newPassword) return toast.error('Isi password lama dan baru');
    if (newPassword.length < 8) return toast.error('Password baru minimal 8 karakter');
    toast.loading('Menyimpan perubahan...', { id: 'pwd' });
    try {
       const res = await fetch('/api/auth/change-password', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ 
           nik: inspectorNik, 
           oldPassword, 
           newPassword, 
           email: email ? email.trim() : undefined 
         })
       });
       const data = await res.json();
       if (data.status !== 'success') throw new Error(data.message || 'Gagal memperbarui password');
       
       toast.success('Password dan profil berhasil diperbarui', { id: 'pwd' });
       setOldPassword('');
       setNewPassword('');
    } catch(e: any) {
       toast.error(e.message || 'Gagal memperbarui password', { id: 'pwd' });
    }
  };

  const handleSaveWaTarget = async () => {
    toast.loading('Menyimpan...', { id: 'wa' });
    try {
       await fetch('/api/settings', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ settingKey: 'WA_TARGET_NUMBER', settingValue: waTarget, description: 'Target nomor WhatsApp untuk notifikasi otomatis' })
       });
       toast.success('Disimpan!', { id: 'wa' });
    } catch(e: any) {
       toast.error('Gagal', { id: 'wa' });
    }
  };

  const handleAdminReset = async () => {
    if (!resetNik || !resetNewPass) return toast.error('Isi NIK dan Password Baru');
    toast.loading('Mereset password...', { id: 'reset' });
    try {
       const res = await fetch('/api/auth/reset-password', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ nik: resetNik, newPassword: resetNewPass, adminReset: true })
       });
       const data = await res.json();
       if (data.status !== 'success') throw new Error(data.message);
       toast.success('Password berhasil direset', { id: 'reset' });
       setResetNik('');
       setResetNewPass('');
    } catch(e: any) {
       toast.error(e.message, { id: 'reset' });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 md:max-w-3xl md:mx-auto">
      <PageHeader 
        title="Pengaturan"
        description="Kelola profil, keamanan, dan preferensi aplikasi"
        icon={<Settings />}
      />

      {inspectorName && (
        <Card>
          <div 
            className="flex items-center gap-4 mb-6 pb-6 border-b"
            style={{ borderColor: 'var(--border-main, #E2E8F0)' }}
          >
            <div 
              className="w-14 h-14 rounded-xl flex items-center justify-center font-display font-semibold text-xl shadow-xs" 
              style={{ backgroundColor: 'var(--primary, #2A9D8F)', color: '#FFFFFF' }}
            >
               {inspectorName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-lg font-display" style={{ color: 'var(--text-main, #1E293B)' }}>
                {inspectorName}
              </div>
              <div className="text-xs font-semibold" style={{ color: 'var(--text-muted, #64748B)' }}>
                 NIK: {inspectorNik} | {profile?.jabatan || 'Crew'}
              </div>
            </div>
          </div>
          <Button variant="danger" onClick={onLogoutKaryawan} className="w-full sm:w-auto">
            <LogOut className="w-4 h-4 mr-2" /> Keluar dari Akun
          </Button>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Profil & Keamanan */}
          <Card className="space-y-4">
            <h3 
              className="text-base font-bold flex items-center gap-2 pb-3 border-b" 
              style={{ 
                color: 'var(--primary, #2A9D8F)', 
                borderColor: 'var(--border-main, #E2E8F0)' 
              }}
            >
              <User className="w-5 h-5" />
              Profil & Keamanan
            </h3>
            
            <div className="space-y-3">
               <Input 
                 label="Alamat Email (Untuk Reset Password)" 
                 type="email"
                 value={email}
                 onChange={e => setEmail(e.target.value)}
               />
               <Input 
                 label="Password Lama" 
                 type="password"
                 value={oldPassword}
                 onChange={e => setOldPassword(e.target.value)}
               />
               <Input 
                 label="Password Baru" 
                 type="password"
                 value={newPassword}
                 onChange={e => setNewPassword(e.target.value)}
               />
               <Button 
                 onClick={handleUpdatePassword} 
                 className="w-full mt-2 font-bold shadow-xs" 
                 style={{ backgroundColor: 'var(--primary, #2A9D8F)', color: '#FFFFFF' }}
               >
                 Simpan Perubahan
               </Button>
            </div>
          </Card>
          
          <div className="space-y-6">
            {/* Card Notifikasi & Suara */}
            <Card className="space-y-4">
              <h3 
                className="text-base font-bold flex items-center gap-2 pb-3 border-b" 
                style={{ 
                  color: 'var(--primary, #2A9D8F)', 
                  borderColor: 'var(--border-main, #E2E8F0)' 
                }}
              >
                <Bell className="w-5 h-5" />
                Notifikasi & Suara
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted, #64748B)' }}>
                Aktifkan suara peringatan saat ada notifikasi masuk di dalam aplikasi.
              </p>
              <div 
                className="flex items-center justify-between p-3 rounded-xl border"
                style={{ 
                  backgroundColor: 'var(--input-bg, #FFFFFF)', 
                  borderColor: 'var(--border-main, #E2E8F0)' 
                }}
              >
                <span className="text-sm font-semibold" style={{ color: 'var(--text-main, #1E293B)' }}>
                  Suara In-App
                </span>
                <input 
                  type="checkbox" 
                  checked={soundEnabled} 
                  onChange={(e) => {
                    setSoundEnabled(e.target.checked);
                    localStorage.setItem('p2h_sound_enabled', e.target.checked ? '1' : '0');
                    if (e.target.checked) toast.success('Suara notifikasi diaktifkan');
                  }} 
                  className="w-5 h-5 cursor-pointer rounded" 
                  style={{ accentColor: 'var(--primary, #2A9D8F)' }}
                />
              </div>
            </Card>

            {/* Card Preferensi Tampilan */}
            <Card className="space-y-4">
              <h3 
                className="text-base font-bold flex items-center gap-2 pb-3 border-b" 
                style={{ 
                  color: 'var(--primary, #2A9D8F)', 
                  borderColor: 'var(--border-main, #E2E8F0)' 
                }}
              >
                <Palette className="w-5 h-5" />
                Preferensi Tampilan
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted, #64748B)' }}>
                Sesuaikan tema aplikasi berdasarkan waktu atau gaya kesukaan Anda.
              </p>
              <div className="space-y-2">
                <Button 
                  onClick={onOpenThemeModal} 
                  className="w-full shadow-xs font-bold flex items-center justify-center gap-2 cursor-pointer" 
                  style={{ backgroundColor: 'var(--primary, #2A9D8F)', color: '#FFFFFF' }}
                >
                   <Palette className="w-4 h-4" />
                   Pengaturan Tema UI
                </Button>
                <button 
                  onClick={() => window.dispatchEvent(new Event('preplab:show_daily_splash'))} 
                  className="w-full py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all opacity-85 hover:opacity-100 cursor-pointer shadow-2xs" 
                  style={{ 
                    backgroundColor: 'var(--input-bg, #FFFFFF)', 
                    borderColor: 'var(--border-main, #E2E8F0)', 
                    color: 'var(--text-main, #1E293B)' 
                  }}
                >
                   <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                   Putar Animasi Sapaan Harian (Splash)
                </button>
              </div>

              {/* Pilihan Ukuran Font Seluruh Portal */}
              <div className="pt-3 border-t space-y-2.5" style={{ borderColor: 'var(--border-main, #E2E8F0)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Type className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold tracking-tight" style={{ color: 'var(--text-main, #1E293B)' }}>
                      Ukuran Font Seluruh Portal
                    </span>
                  </div>
                  <span 
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs"
                    style={{ 
                      backgroundColor: 'var(--input-bg, #FFFFFF)', 
                      borderColor: 'var(--border-main, #CBD5E1)',
                      color: 'var(--primary, #2A9D8F)' 
                    }}
                  >
                    {FONT_SIZE_OPTIONS.find(o => o.id === activeFontSize)?.label} ({FONT_SIZE_OPTIONS.find(o => o.id === activeFontSize)?.desc})
                  </span>
                </div>

                <div 
                  className="grid grid-cols-5 gap-1 p-1 rounded-xl border"
                  style={{ 
                    backgroundColor: 'var(--bg-main, #F8FAFC)', 
                    borderColor: 'var(--border-main, #E2E8F0)' 
                  }}
                >
                  {FONT_SIZE_OPTIONS.map((opt) => {
                    const isSelected = activeFontSize === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setActiveFontSize(opt.id);
                          applyFontSize(opt.id);
                          toast.success(`Ukuran font diubah ke: ${opt.label}`);
                        }}
                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-center transition-all cursor-pointer select-none ${
                          isSelected 
                            ? 'shadow-xs ring-1 ring-emerald-500/50' 
                            : 'hover:bg-black/5 opacity-70 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: isSelected ? 'var(--card-bg, #FFFFFF)' : 'transparent',
                          color: isSelected ? 'var(--primary, #2A9D8F)' : 'var(--text-main, #1E293B)',
                          border: isSelected ? '1px solid var(--border-main, #CBD5E1)' : '1px solid transparent'
                        }}
                        title={`${opt.label} (${opt.desc})`}
                      >
                        <span className={`leading-none mb-1 font-black ${
                          opt.id === 'xs' ? 'text-[11px]' : opt.id === 'sm' ? 'text-xs' : opt.id === 'md' ? 'text-sm' : opt.id === 'lg' ? 'text-base' : 'text-lg'
                        }`}>
                          A
                        </span>
                        <span className="text-[9.5px] font-semibold leading-tight truncate max-w-full">
                          {opt.id === 'xs' ? 'Extra Small' : opt.id === 'sm' ? 'Small' : opt.id === 'md' ? 'Medium' : opt.id === 'lg' ? 'Large' : 'Extra Large'}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted, #64748B)' }}>
                  Skala font berlaku instan untuk semua modul, dashboard, tabel data, dan buletin portal.
                </p>
              </div>

              {/* Mode Tampilan Mobile (Smartphone: Simple vs Full) */}
              <div className="pt-3 border-t space-y-2.5" style={{ borderColor: 'var(--border-main, #E2E8F0)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-bold tracking-tight" style={{ color: 'var(--text-main, #1E293B)' }}>
                      Mode Tampilan Mobile (Smartphone)
                    </span>
                  </div>
                  <span 
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs"
                    style={{ 
                      backgroundColor: 'var(--input-bg, #FFFFFF)', 
                      borderColor: 'var(--border-main, #CBD5E1)',
                      color: mobileMode === 'simple' ? 'var(--primary, #2A9D8F)' : 'var(--text-muted, #64748B)' 
                    }}
                  >
                    {mobileMode === 'simple' ? '⚡ Mode Sederhana' : '🖥️ Mode Lengkap'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Option 1: Simple Mode */}
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMode('simple');
                      toast.success('Mode Sederhana diaktifkan untuk perangkat mobile');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all active:scale-[0.98] cursor-pointer ${
                      mobileMode === 'simple'
                        ? 'bg-teal-500/10 border-teal-500/50 ring-2 ring-teal-500/20 shadow-xs'
                        : 'bg-[var(--input-bg,white)] border-[var(--border-main,#E2E8F0)] opacity-75 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-teal-600" />
                        <span className="font-bold text-xs" style={{ color: 'var(--text-main, #1E293B)' }}>
                          Mode Sederhana
                        </span>
                      </div>
                      {mobileMode === 'simple' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-teal-600 text-white flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Default
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] leading-snug" style={{ color: 'var(--text-muted, #64748B)' }}>
                      Fokus tugas shift, tombol aksi besar, ringan &amp; cepat untuk personil di lapangan.
                    </p>
                  </button>

                  {/* Option 2: Full Mode */}
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMode('full');
                      toast.success('Mode Lengkap diaktifkan untuk perangkat mobile');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all active:scale-[0.98] cursor-pointer ${
                      mobileMode === 'full'
                        ? 'bg-teal-500/10 border-teal-500/50 ring-2 ring-teal-500/20 shadow-xs'
                        : 'bg-[var(--input-bg,white)] border-[var(--border-main,#E2E8F0)] opacity-75 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <LayoutGrid className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                        <span className="font-bold text-xs" style={{ color: 'var(--text-main, #1E293B)' }}>
                          Mode Lengkap
                        </span>
                      </div>
                      {mobileMode === 'full' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-teal-600 text-white flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] leading-snug" style={{ color: 'var(--text-muted, #64748B)' }}>
                      Menampilkan semua grafik analitik, tabel jadwal mingguan, dan widget seperti versi desktop.
                    </p>
                  </button>
                </div>
              </div>
            </Card>

            {/* Card Bantuan & Laporan Bug */}
            <Card className="space-y-3">
              <h3 
                className="text-base font-bold flex items-center gap-2 pb-2 border-b" 
                style={{ 
                  color: 'var(--primary, #2A9D8F)', 
                  borderColor: 'var(--border-main, #E2E8F0)' 
                }}
              >
                <MessageSquarePlus className="w-5 h-5 text-rose-500" />
                Bantuan & Masukan Sistem
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted, #64748B)' }}>
                Menemukan kendala teknis, tombol error, atau punya ide pengembangan fitur baru? Laporkan langsung ke tim Developer.
              </p>
              <button
                type="button"
                onClick={() => onNav ? onNav('feedback-support') : (window.location.pathname = '/feedback-support')}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] hover:opacity-90"
                style={{ backgroundColor: 'var(--primary, #2A9D8F)', color: '#FFFFFF' }}
              >
                <MessageSquarePlus className="w-4 h-4" />
                <span>Beri Masukan / Laporkan Bug</span>
              </button>
            </Card>

            {inspectorNik === '02D250000' && (
              <Card 
                className="space-y-4 border-l-4" 
                style={{ borderLeftColor: '#F43F5E' }}
              >
                <h3 
                  className="text-base font-bold flex items-center gap-2 pb-3 border-b text-rose-600 dark:text-rose-400"
                  style={{ borderColor: 'var(--border-main, #E2E8F0)' }}
                >
                  <ShieldAlert className="w-5 h-5" />
                  Developer Admin
                </h3>
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted, #64748B)' }}>
                  Reset password akun karyawan (Bypass)
                </p>
                <Input 
                  label="NIK Target" 
                  value={resetNik}
                  onChange={e => setResetNik(e.target.value)}
                />
                <Input 
                  label="Password Baru" 
                  value={resetNewPass}
                  onChange={e => setResetNewPass(e.target.value)}
                />
                <Button variant="danger" onClick={handleAdminReset} className="w-full mt-2 font-bold">
                  Force Reset Password
                </Button>
                
                <h3 
                  className="text-sm font-bold flex items-center gap-2 pt-4 pb-2 border-b mt-4"
                  style={{ color: 'var(--text-main, #1E293B)', borderColor: 'var(--border-main, #E2E8F0)' }}
                >
                  Target Notifikasi WhatsApp
                </h3>
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted, #64748B)' }}>
                  Jika diisi, modal kirim WA akan langsung menuju ke nomor/PIC ini. (Format: 62812...)
                </p>
                <div className="flex gap-2">
                   <Input 
                      value={waTarget}
                      onChange={e => setWaTarget(e.target.value)}
                      placeholder="628..."
                      containerClassName="flex-1 !mb-0"
                   />
                   <Button 
                     onClick={handleSaveWaTarget} 
                     className="shrink-0 font-bold"
                     style={{ backgroundColor: 'var(--primary, #2A9D8F)', color: '#FFFFFF' }}
                   >
                     Simpan
                   </Button>
                </div>
              </Card>
            )}
          </div>
      </div>
    </div>
  );
}
