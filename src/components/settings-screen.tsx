import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from './ui';
import { LogOut, User, Lock, Mail, Settings2, Palette, ShieldAlert , Settings } from 'lucide-react';
import { toast } from 'sonner';
import { getAppSettings } from '../sheets-api';
import { PageHeader } from './PageHeader';

export function SettingsScreen({ inspectorName, inspectorNik, onLogoutKaryawan, onOpenThemeModal }: { inspectorName: string | null, inspectorNik: string | null, onLogoutKaryawan: () => void, onOpenThemeModal: () => void }) {
  const [profile, setProfile] = useState<any>(null);
  
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
    toast.loading('Menyimpan...', { id: 'pwd' });
    try {
       // Since we don't have a specific change password endpoint that checks old password
       // we can re-use login to check old password, then auth/setup to set new
       const res = await fetch('/api/auth/login', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ nik: inspectorNik, password: oldPassword })
       });
       const data = await res.json();
       if (data.status !== 'success') throw new Error(data.message);
       
       const res2 = await fetch('/api/auth/setup', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ nik: inspectorNik, password: newPassword, email: email })
       });
       const data2 = await res2.json();
       if (data2.status !== 'success') throw new Error(data2.message);
       
       toast.success('Password dan profil diperbarui', { id: 'pwd' });
       setOldPassword('');
       setNewPassword('');
    } catch(e: any) {
       toast.error(e.message, { id: 'pwd' });
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
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center font-display font-semibold text-xl shadow-sm" style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>
               {inspectorName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-lg font-display" style={{ color: 'var(--text-main)' }}>
                {inspectorName}
              </div>
              <div className="text-xs font-semibold opacity-70" style={{ color: 'var(--text-muted)' }}>
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
          <Card className="space-y-4">
            <h3 className="text-base font-bold flex items-center gap-2 pb-3 border-b border-slate-100" style={{ color: 'var(--primary)' }}>
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
               <Button onClick={handleUpdatePassword} className="w-full mt-2" style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>Simpan Perubahan</Button>
            </div>
          </Card>
          
          <div className="space-y-6">
            
            <Card className="space-y-4">
              <h3 className="text-base font-bold flex items-center gap-2 pb-3 border-b border-slate-100" style={{ color: 'var(--primary)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bell"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                Notifikasi & Suara
              </h3>
              <p className="text-sm opacity-70">Aktifkan suara peringatan saat ada notifikasi masuk di dalam aplikasi.</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Suara In-App</span>
                <input 
                  type="checkbox" 
                  checked={soundEnabled} 
                  onChange={(e) => {
                    setSoundEnabled(e.target.checked);
                    localStorage.setItem('p2h_sound_enabled', e.target.checked ? '1' : '0');
                    if (e.target.checked) toast.success('Suara notifikasi diaktifkan');
                  }} 
                  className="w-5 h-5 accent-slate-900" 
                />
              </div>
            </Card>

            <Card className="space-y-4">
              <h3 className="text-base font-bold flex items-center gap-2 pb-3 border-b border-slate-100" style={{ color: 'var(--primary)' }}>
                <Palette className="w-5 h-5" />
                Preferensi Tampilan
              </h3>
              <p className="text-sm opacity-70">Sesuaikan tema aplikasi berdasarkan waktu atau gaya kesukaan Anda.</p>
              <Button onClick={onOpenThemeModal} className="w-full shadow-sm" style={{ backgroundColor: 'var(--accent)', color: 'var(--text-main)' }}>
                 Pengaturan Tema UI
              </Button>
            </Card>

            {inspectorNik === '02D250000' && (
              <Card className="space-y-4 border-l-4 border-rose-500">
                <h3 className="text-base font-bold flex items-center gap-2 pb-3 border-b border-slate-100 text-rose-600">
                  <ShieldAlert className="w-5 h-5" />
                  Developer Admin
                </h3>
                <p className="text-xs text-slate-500 mb-2">Reset password akun karyawan (Bypass)</p>
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
                <Button variant="danger" onClick={handleAdminReset} className="w-full mt-2">Force Reset Password</Button>
                
                <h3 className="text-sm font-bold flex items-center gap-2 pt-4 pb-2 border-b border-slate-100 text-slate-800 mt-4">
                  Target Notifikasi WhatsApp
                </h3>
                <p className="text-xs text-slate-500 mb-2">Jika diisi, modal kirim WA akan langsung menuju ke nomor/PIC ini. (Format: 62812...)</p>
                <div className="flex gap-2">
                   <Input 
                      value={waTarget}
                      onChange={e => setWaTarget(e.target.value)}
                      placeholder="628..."
                   />
                   <Button onClick={handleSaveWaTarget} className="shrink-0 bg-slate-900 hover:bg-slate-800 text-white">Simpan</Button>
                </div>
              </Card>
            )}
          </div>
      </div>
    </div>
  );
}
