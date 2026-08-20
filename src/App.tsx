import { NotificationBell } from "./components/notification-bell";
import React, { useState, useEffect, Suspense, lazy, useRef, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import { Cloud,  Activity, Settings, ShieldCheck, CheckCircle2, AlertTriangle, LogOut, FileSpreadsheet, Check, Wrench, ChevronRight, Image as ImageIcon, Camera, X, Code2, ChevronLeft, UploadCloud, Layers, Home, ClipboardList, CheckSquare, PlusCircle, ListTodo, ThermometerSun, LineChart, ClipboardCheck, User, Menu, Calendar, Utensils, FileText, Eye, BriefcaseMedical , Building2, LayoutDashboard, MessageCircle  } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { appendRowsToSheet, getDowntimeRecords,updateDowntimeRepair, getEmployees, loginEmployee, getEquipments, ToolRecord, updateToolPhotoUrl, uploadPhotoToDrive } from './sheets-api';
import { Button, Card, Input, Select, Textarea } from './components/ui';
import { Toaster, toast } from 'sonner';
import ThemeModal from './components/ThemeModal';
import { Palette } from 'lucide-react';
import { initAuth, googleSignIn } from './google-auth';
import { WhatsAppModal } from './components/whatsapp-modal';



















const CreateWOScreen = lazy(() => import('./components/create-wo-screen').then(m => ({ default: m.CreateWOScreen })));
const CreateInternalTicketScreen = lazy(() => import('./components/create-internal-ticket-screen').then(m => ({ default: m.CreateInternalTicketScreen })));
const WOListScreen = lazy(() => import('./components/wo-list-screen').then(m => ({ default: m.WOListScreen })));
const TicketScreen = lazy(() => import('./components/ticket-screen').then(m => ({ default: m.TicketScreen })));
const PemantauanScreen = lazy(() => import('./components/pemantauan-screen').then(m => ({ default: m.PemantauanScreen })));
const ProfileScreen = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const RosterAdminScreen = lazy(() => import('./components/roster-admin-screen').then(m => ({ default: m.RosterAdminScreen })));
const MonitoringDashboard = lazy(() => import('./components/monitoring-dashboard').then(m => ({ default: m.MonitoringDashboard })));
const WeeklyInspectionScreen = lazy(() => import('./components/weekly-inspection-screen').then(m => ({ default: m.WeeklyInspectionScreen })));
const ChatScreen = lazy(() => import('./components/ChatScreen').then(m => ({ default: m.default })));
const ApdInputScreen = lazy(() => import('./components/apd-input-screen').then(m => ({ default: m.ApdInputScreen })));
const ApdSettingsScreen = lazy(() => import('./components/apd-settings-screen').then(m => ({ default: m.ApdSettingsScreen })));
const ApdMonitoringScreen = lazy(() => import('./components/apd-monitoring-screen').then(m => ({ default: m.ApdMonitoringScreen })));
const InduksiScreen = lazy(() => import('./components/induksi-screen').then(m => ({ default: m.InduksiScreen })));
const HomeScreen = lazy(() => import('./components/home-screen').then(m => ({ default: m.HomeScreen })));
const QuizScreen = lazy(() => import('./components/quiz-screen').then(m => ({ default: m.QuizScreen })));
const QuizAdminScreen = lazy(() => import('./components/quiz-admin-screen').then(m => ({ default: m.QuizAdminScreen })));
const InspectionScreen = lazy(() => import('./components/inspection-screen').then(m => ({ default: m.InspectionScreen })));
const DowntimePage = lazy(() => import('./pages/DowntimePage').then(m => ({ default: m.DowntimePage })));
const SettingsScreen = lazy(() => import('./components/settings-screen').then(m => ({ default: m.SettingsScreen })));
const PreplabCloudScreen = lazy(() => import('./components/preplab-cloud-screen').then(m => ({ default: m.PreplabCloudScreen })));
const AdminDashboard = lazy(() => import('./components/admin-dashboard').then(m => ({ default: m.AdminDashboard })));
const SapDashboard = lazy(() => import('./components/sap-dashboard').then(m => ({ default: m.SapDashboard })));
const AgendaDashboard = lazy(() => import('./components/agenda-dashboard').then(m => ({ default: m.AgendaDashboard })));
const AdmDashboard = lazy(() => import('./components/adm-dashboard').then(m => ({ default: m.AdmDashboard })));
const PelanggaranDashboard = lazy(() => import('./components/pelanggaran-dashboard').then(m => ({ default: m.PelanggaranDashboard })));

const BulletinBoard = lazy(() => import('./components/bulletin-board').then(m => ({ default: m.BulletinBoard })));
const UserManualScreen = lazy(() => import('./components/user-manual-screen').then(m => ({ default: m.UserManualScreen })));
const EmployeeDatabaseScreen = lazy(() => import('./components/employee-database-screen').then(m => ({ default: m.EmployeeDatabaseScreen })));
const EasterEggGame = lazy(() => import('./components/easter-egg-game').then(m => ({ default: m.EasterEggGame })));

export default function App() {

  // Global WhatsApp modal state — lifted here so it survives route changes
  const [globalWaMessage, setGlobalWaMessage] = useState('');

  // Listen for SW messages (push received)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    
    const playNotificationSound = async () => {
      const isEnabled = localStorage.getItem('p2h_sound_enabled') !== '0';
      if (!isEnabled) return;
      
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContext();
        if (ctx.state === 'suspended') await ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.1); // C6
        
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      } catch (e) {
        console.error('Failed to play sound', e);
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PUSH_RECEIVED') {
        playNotificationSound();
        toast(event.data.data.title, {
          description: event.data.data.body,
          icon: '🔔'
        });
      }
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, []);

  // Inspector Login State
  const [inspectorName, setInspectorName] = useState<string | null>(() => {
    return localStorage.getItem('p2h_inspector_name') || null;
  });
  const [inspectorNik, setInspectorNik] = useState<string | null>(() => {
    return localStorage.getItem('p2h_inspector_nik') || null;
  });
  const [nikInput, setNikInput] = useState('');
  const [karyawanList, setKaryawanList] = useState<{nik: string, nama: string}[]>([]);
  const [isVerifyingNik, setIsVerifyingNik] = useState(false);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Easter Egg State
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showEasterEgg, setShowEasterEgg] = useState(false);

  const handleLogoClick = () => {
    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);
    if (newCount >= 5) {
      setShowEasterEgg(true);
      setLogoClickCount(0);
    }
  };

  // Global App State
  
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname === '/' ? 'home' : location.pathname.substring(1);

  const [syncTick, setSyncTick] = useState(0);

  useEffect(() => {
    const handleProfileUpdate = () => setSyncTick(t => t + 1);
    window.addEventListener('profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('profile_updated', handleProfileUpdate);
  }, []);

  const userProfile = React.useMemo(() => {
    try {
      const p = localStorage.getItem("p2h_inspector_profile");
      return p ? JSON.parse(p) : null;
    } catch(e) {
      return null;
    }
  }, [inspectorNik, syncTick]);

  const headerAvatar = React.useMemo(() => {
    if (inspectorNik) {
      const savedAvatar = localStorage.getItem(`p2h_inspector_avatar_${inspectorNik}`);
      if (savedAvatar) return savedAvatar;
    }
    if (userProfile?.avatar) return userProfile.avatar;
    return null;
  }, [inspectorNik, userProfile, syncTick]);

  const isCrewRole = React.useMemo(() => {
    return userProfile?.jabatan?.toLowerCase().includes('crew') || false;
  }, [userProfile]);

  const userDept = React.useMemo(() => {
    if (!userProfile) return null;
    const s = (userProfile.section || "").toLowerCase();
    const j = (userProfile.jabatan || "").toLowerCase();
    
    if (s.includes("qa") || s.includes("quality assurance") || j.includes("manager") || j.includes("qa")) {
      return "ALL";
    }

    if (s.includes("preparation") || s.includes("dry") || s.includes("wet")) return "Preparation";
    if (s.includes("laboratory") || s.includes("lab")) return "Laboratory";
    if (s.includes("maintenance")) return "Maintenance";
    if (s.includes("administration") || s.includes("admin")) return "Administration";
    if (s.includes("inventory") || s.includes("inv")) return "Inventory Control";

    return null;
  }, [userProfile]);
  const [showProfileScreen, setShowProfileScreen] = useState(false);
  const [showBulletinMenu, setShowBulletinMenu] = useState(false);
  const [loading, setLoading] = useState(true);

  // Theme state
  const [currentMode, setCurrentMode] = useState('morning');
  const [showGlobalThemeModal, setShowGlobalThemeModal] = useState(false);
  const [userThemes, setUserThemes] = useState<any>({
    morning: { '--bg-main': '#FFFFFF', '--primary': '#2A9D8F', '--primary-hover': '#23A3B4', '--accent': '#E9930D', '--card-bg': '#FFFFFF', '--text-main': '#333333', '--text-muted': '#4A4A4A', '--border-main': '#DCE8F8', '--input-bg': '#FFFFFF', '--bubble-color': '#E9930D' },
    afternoon: { '--bg-main': '#FFFFFF', '--primary': '#2A9D8F', '--primary-hover': '#23A3B4', '--accent': '#E9930D', '--card-bg': '#FFFFFF', '--text-main': '#333333', '--text-muted': '#4A4A4A', '--border-main': '#DCE8F8', '--input-bg': '#FFFFFF', '--bubble-color': '#E9930D' },
    evening: { '--bg-main': '#0F172A', '--primary': '#2A9D8F', '--primary-hover': '#23A3B4', '--accent': '#E9930D', '--card-bg': '#1E293B', '--text-main': '#F8FAFC', '--text-muted': '#94A3B8', '--border-main': '#334155', '--input-bg': '#0F172A', '--bubble-color': '#E9930D' }
  });

  const checkTimeAndSetTheme = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setCurrentMode('morning');
    else if (hour >= 12 && hour < 18) setCurrentMode('afternoon');
    else setCurrentMode('evening');
  };

  const applyThemeToDOM = (colors: any) => {
    const root = document.documentElement;
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(key, value as string);
    });
  };

  useEffect(() => {
    checkTimeAndSetTheme();
    const interval = setInterval(checkTimeAndSetTheme, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (userThemes[currentMode]) {
      applyThemeToDOM(userThemes[currentMode]);
    }
  }, [currentMode, userThemes]);

  useEffect(() => {
    const loadThemes = async () => {
      if (!inspectorNik) return;
      try {
        const res = await fetch(`/api/themes/${inspectorNik}`);
        const json = await res.json();
        if (json.status === 'success' && Object.keys(json.data).length > 0) {
          setUserThemes((prev: any) => ({
            morning: json.data.morning?.colors || prev.morning,
            afternoon: json.data.afternoon?.colors || prev.afternoon,
            evening: json.data.evening?.colors || prev.evening,
          }));
        }
      } catch (err) {
        console.error("Gagal load theme", err);
      }
    };
    loadThemes();
  }, [inspectorNik]);

  useEffect(() => {
    const syncProfile = async () => {
      if (!inspectorNik) return;
      try {
        const res = await fetch(`/api/employees/${inspectorNik}`);
        const data = await res.json();
        if (data.status === 'success' && data.employee) {
          localStorage.setItem('p2h_inspector_profile', JSON.stringify(data.employee));
          if (data.employee.avatar) {
            localStorage.setItem(`p2h_inspector_avatar_${inspectorNik}`, data.employee.avatar);
          } else {
            localStorage.removeItem(`p2h_inspector_avatar_${inspectorNik}`);
          }
          // Force a re-render by dispatching a storage event if needed, but the profile-screen and others usually load dynamically.
          // In App.tsx, the userProfile useMemo might not trigger unless inspectorNik changes.
          // To fix that, we can reload or rely on next interactions, or state.
          // We can dispatch a custom event.
          window.dispatchEvent(new Event('profile_updated'));
        }
      } catch (err) {
        console.error("Gagal sinkronisasi profil", err);
      }
    };
    syncProfile();
  }, [inspectorNik]);

  const handleThemeUpdated = (mode: string, colors: any) => {
    setUserThemes((prev: any) => ({ ...prev, [mode]: colors }));
  };


  
  const handleNav = (tab: string) => {
    if (tab === 'home') navigate('/');
    else navigate('/' + tab);
  };


  useEffect(() => {
    const unsubAuth = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setIsGoogleLoading(false);
      },
      () => {
        setGoogleUser(null);
        setIsGoogleLoading(false);
      }
    );
    return () => {
      if (unsubAuth) unsubAuth();
    };
  }, []);

  

  const queryClient = useQueryClient();

  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: getEmployees,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const { data: equipmentCategories, isLoading: loadingEquipments } = useQuery({
    queryKey: ['equipments'],
    queryFn: getEquipments,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  const fetchMasterData = async () => {
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['employees'] }),
        queryClient.invalidateQueries({ queryKey: ['equipments'] })
      ]);
    } catch (err) {
      console.error("Gagal load master data", err);
    }
  };

  const { data: appEnv } = useQuery({
    queryKey: ['appEnv'],
    queryFn: async () => {
      const res = await fetch('/api/config/env');
      const data = await res.json();
      return data.env;
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (employeesData) {
      setKaryawanList(employeesData);
    }
  }, [employeesData]);

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);



  
  
  const [loginStep, setLoginStep] = useState<'nik' | 'password' | 'setup' | 'forgot'>('nik');
  const [passwordInput, setPasswordInput] = useState('');
  const [requireSetup, setRequireSetup] = useState(false);
  const [setupPassword1, setSetupPassword1] = useState('');
  const [setupPassword2, setSetupPassword2] = useState('');
  const [setupTanggalLahir, setSetupTanggalLahir] = useState('');
  const [setupEmail, setSetupEmail] = useState('');
  
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  
  const handleNikLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nikInput) return;
    
    setIsVerifyingNik(true);
    const inputNik = nikInput.trim();
    
    try {
      if (loginStep === 'nik') {
         const res = await fetch('/api/auth/check-nik', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ nik: inputNik })
         });
         const data = await res.json();
         if (data.status === 'success') {
             const isCrew = data.employee?.jabatan?.toLowerCase().includes('crew');
             if (isCrew) {
                 toast.success("Login otomatis sebagai Crew!");
                 setInspectorNik(inputNik);
                 setInspectorName(data.employee.name);
                 localStorage.setItem('p2h_inspector_nik', inputNik);
                 localStorage.setItem('p2h_inspector_name', data.employee.name);
                 localStorage.setItem('p2h_inspector_jabatan', data.employee.jabatan || 'Crew');
                 localStorage.setItem('p2h_inspector_profile', JSON.stringify(data.employee));
                 setLoginStep('nik');
                 handleNav('quiz');
             } else if (data.firstLoginComplete) {
                 setLoginStep('password');
             } else {
                 setLoginStep('setup');
                 toast.info("Ini adalah login pertama Anda. Silakan setup password.");
             }
         } else {
             toast.error(data.message || 'NIK tidak ditemukan');
         }
      } else if (loginStep === 'forgot') {
         const res = await fetch('/api/auth/reset-password', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ nik: inputNik, email: forgotEmail, adminReset: false })
         });
         const data = await res.json();
         if (data.status === 'success') {
             toast.success(data.message || "Password sementara telah dikirim.");
             setLoginStep('password');
         } else {
             toast.error(data.message);
         }
      } else if (loginStep === 'setup') {
         if (setupPassword1 !== setupPassword2) {
             toast.error("Konfirmasi password tidak cocok!");
             setIsVerifyingNik(false);
             return;
         }
         if (setupPassword1.length < 6) {
             toast.error("Password minimal 6 karakter!");
             setIsVerifyingNik(false);
             return;
         }
         if (!setupTanggalLahir) {
             toast.error("Tanggal lahir harus diisi!");
             setIsVerifyingNik(false);
             return;
         }
         const res = await fetch('/api/auth/setup', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ 
                 nik: inputNik, 
                 password: setupPassword1, 
                 email: setupEmail,
                 tanggalLahir: setupTanggalLahir 
             })
         });
         const data = await res.json();
         if (data.status === 'success') {
             toast.success("Setup berhasil!");
             setInspectorNik(inputNik);
             setInspectorName(data.employee.name);
             localStorage.setItem('p2h_inspector_nik', inputNik);
             localStorage.setItem('p2h_inspector_name', data.employee.name);
             localStorage.setItem('p2h_inspector_jabatan', data.employee.jabatan || 'Crew');
             localStorage.setItem('p2h_inspector_profile', JSON.stringify(data.employee));
             setLoginStep('nik');
         } else {
             toast.error(data.message);
         }
      } else if (loginStep === 'password') {
          // Standard login
          const res = await fetch('/api/auth/login', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ nik: inputNik, password: passwordInput })
          });
          const data = await res.json();
          
          if (data.status === 'success') {
              if (data.requireSetup) {
                  setLoginStep('setup');
                  toast.info("Ini adalah login pertama Anda. Silakan setup password.");
              } else {
                  const validNik = data.employee.nik;
                  setInspectorNik(validNik);
                  setInspectorName(data.employee.name);
                  localStorage.setItem('p2h_inspector_nik', validNik);
                  localStorage.setItem('p2h_inspector_name', data.employee.name);
                  localStorage.setItem('p2h_inspector_jabatan', data.employee.jabatan || 'Crew');
                  localStorage.setItem('p2h_inspector_profile', JSON.stringify(data.employee));
                  toast.success("Login berhasil");
                  setLoginStep('nik');
                  setPasswordInput('');
              }
          } else {
             const errMsg = data.message || 'Error login';
             if (errMsg.toLowerCase().includes('password') || errMsg.toLowerCase().includes('nik')) {
                 toast.error(errMsg);
             } else {
                 toast.error(`${errMsg}. Hubungi tim QA untuk informasi lebih lanjut.`);
             }
          }
      }
    } catch (err: any) {
      toast.error(`Gagal menghubungi server. ${err.message}. Hubungi tim QA untuk informasi lebih lanjut.`);
    } finally {
      setIsVerifyingNik(false);
    }
  };



  const handleLogoutKaryawan = () => {
    setInspectorName(null);
    setInspectorNik(null);
    setNikInput('');
    localStorage.removeItem('p2h_inspector_name');
    localStorage.removeItem('p2h_inspector_nik');
    localStorage.removeItem('p2h_inspector_jabatan');
    localStorage.removeItem('p2h_inspector_profile');
    handleNav('home');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7F6] flex items-center justify-center text-teal-600">
        <Activity className="animate-spin w-8 h-8" />
      </div>
    );
  }



  // TIER 2: Inspektor Login (Kiosk mode) & Google Login
  if (isGoogleLoading) {
    return <div className="min-h-screen bg-[#F4F7F6] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700"></div></div>;
  }
  if ((!inspectorName) && activeTab !== 'settings') {
    return (
      <div className="min-h-screen bg-[#F4F7F6] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-slate-200/50 to-transparent pointer-events-none"></div>
        
        <Card className="w-full max-w-sm z-10 space-y-6 !p-8 shadow-xl border border-slate-200">
          <div className="w-20 h-20 mx-auto bg-slate-800 rounded-2xl p-3 shadow-lg mb-4 flex items-center justify-center">
            <img src="/logo.png" alt="Prep & Lab Logo" className="w-full h-full object-contain" onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="%23ccccccc" /><text x="50" y="55" font-family="sans-serif" font-size="20" text-anchor="middle" fill="%23fff">No Logo</text></svg>'; 
            }} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-semibold font-display tracking-tight text-slate-800">Login Portal</h1>
            <p className="text-sm text-slate-500 mt-2">Masukkan NIK Karyawan</p>
          </div>
          
          

<form onSubmit={handleNikLogin} className="space-y-4 pt-4 text-left">
    {loginStep === 'nik' && (

       <>
        <Input 
          label="Nomor Induk Karyawan (NIK)" 
          placeholder="Contoh: 121088..."
          value={nikInput}
          onChange={e => setNikInput(e.target.value)}
          required
          autoFocus
          className="text-center text-lg font-mono tracking-widest"
        />
        <Button type="submit" disabled={isVerifyingNik} className="w-full">
          {isVerifyingNik ? 'Mengecek NIK...' : 'Lanjut'}
        </Button>
       </>
    )}

    {loginStep === 'password' && (
       <>
        <div className="text-center mb-4">
           <p className="text-sm font-medium text-slate-800">NIK: {nikInput}</p>
           <button type="button" onClick={() => setLoginStep('nik')} className="text-xs text-teal-600 underline">Ganti NIK</button>
        </div>
        <Input 
          label="Password" 
          type="password"
          placeholder="***"
          value={passwordInput}
          onChange={e => setPasswordInput(e.target.value)}
          required
          autoFocus
        />
        <Button type="submit" disabled={isVerifyingNik} className="w-full">
          {isVerifyingNik ? 'Verifikasi...' : 'Login Sesi'}
        </Button>
        <div className="text-center">
            <button type="button" onClick={() => setLoginStep('forgot')} className="text-xs text-slate-500 hover:text-teal-600 underline">Lupa Password?</button>
        </div>
       </>
    )}

    {loginStep === 'setup' && (
        <div className="space-y-3">
            <p className="text-xs text-rose-600 font-medium mb-2">Setup Login Pertama Kali</p>
            <Input 
              label="Email Aktif (Untuk Reset Password)" 
              type="email"
              value={setupEmail}
              onChange={e => setSetupEmail(e.target.value)}
              required
            />
            <div className="space-y-1">
                <Input 
                  label="Tanggal Lahir (Pertanyaan Verifikasi)" 
                  type="date"
                  value={setupTanggalLahir}
                  onChange={e => setSetupTanggalLahir(e.target.value)}
                  required
                />
                <p className="text-[10px] text-slate-500">Tanggal lahir akan dicatat di sistem sebagai tanggal ulang tahun Anda.</p>
            </div>
            <Input 
              label="Password Baru" 
              type="password"
              value={setupPassword1}
              onChange={e => setSetupPassword1(e.target.value)}
              required
            />
            <Input 
              label="Konfirmasi Password Baru" 
              type="password"
              value={setupPassword2}
              onChange={e => setSetupPassword2(e.target.value)}
              required
            />
            <Button type="submit" disabled={isVerifyingNik} className="w-full">
              {isVerifyingNik ? 'Menyimpan...' : 'Simpan Password & Profil'}
            </Button>
            <Button variant="secondary" type="button" onClick={() => setLoginStep('nik')} className="w-full">Batal</Button>
        </div>
    )}

    {loginStep === 'forgot' && (
        <div className="space-y-3">
            <p className="text-xs text-indigo-600 font-medium mb-2">Reset Password</p>
            <Input 
              label="Nomor Induk Karyawan (NIK)" 
              value={nikInput}
              disabled
            />
            <Input 
              label="Email Aktif Anda" 
              type="email"
              value={forgotEmail}
              onChange={e => setForgotEmail(e.target.value)}
              required
              autoFocus
            />
            <Button type="submit" disabled={isVerifyingNik} className="w-full">
              {isVerifyingNik ? 'Memproses...' : 'Kirim Link Reset'}
            </Button>
            <Button variant="secondary" type="button" onClick={() => setLoginStep('password')} className="w-full">Batal</Button>
        </div>
    )}
</form>


        </Card>
      </div>
    );
  }


  return (
    <div className="flex w-full min-h-[100dvh] overflow-hidden" style={{ backgroundColor: 'var(--bg-main, #F4F7F6)' }}>
      <div 
        className={`flex-1 relative transition-all duration-300 overflow-x-hidden overflow-y-auto h-[100dvh] ${showProfileScreen ? 'md:mr-[400px] lg:mr-[480px]' : ''}`}
        style={{ backgroundColor: 'var(--bg-main, #F4F7F6)', color: 'var(--text-main, #333)' }}
      >
        {appEnv === 'staging' && (
          <div className="w-full bg-orange-500 text-white text-xs font-bold py-1 px-4 text-center z-[100] relative tracking-widest uppercase">
            STAGING ENVIRONMENT - DATA TEST
          </div>
        )}
        <div className="flex flex-col pb-20 relative min-h-[100dvh]">
          {/* Modals & Portals */}
          <ThemeModal 
            show={showGlobalThemeModal} 
            onClose={() => setShowGlobalThemeModal(false)} 
            currentMode={currentMode} 
            userThemes={userThemes} 
            inspectorNik={inspectorNik} 
            onThemeUpdated={handleThemeUpdated} 
          />
          
          {/* Easter Egg Modal */}
          <AnimatePresence>
            {showEasterEgg && (
              <Suspense fallback={null}>
                <EasterEggGame onClose={() => setShowEasterEgg(false)} />
              </Suspense>
            )}
          </AnimatePresence>
          
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-slate-200/50 to-transparent pointer-events-none"></div>
      
      {/* Header */}
      <header className="px-4 md:px-6 lg:px-8 py-3 sticky top-0 z-50 bg-[#F4F7F6]/80 backdrop-blur-md border-b border-slate-200/50 w-full flex justify-center">
        <div className="flex justify-between items-center w-full">
        <div className="flex items-center gap-3">
          {activeTab !== 'home' ? (
            <button 
              onClick={() => window.history.back()} 
              className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm text-slate-600 active:scale-95 transition-transform"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <div 
              className="w-8 h-8 bg-slate-800 rounded-lg p-1 flex items-center justify-center shadow-sm cursor-pointer"
              onClick={handleLogoClick}
            >
               <img src="/logo.png" alt="Prep & Lab Logo" className="w-full h-full object-contain" onError={(e) => {
                 (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="%23ccccccc" /><text x="50" y="55" font-family="sans-serif" font-size="20" text-anchor="middle" fill="%23fff">No Logo</text></svg>'; 
               }} />
            </div>
          )}
          <span className="font-semibold font-display tracking-tight text-base text-slate-800 whitespace-nowrap">Prep & Lab Portal</span>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell userNik={inspectorNik || undefined} />
          <button 
            onClick={() => setShowProfileScreen(true)}
            className="w-8 h-8 rounded-full bg-teal-100 overflow-hidden border border-teal-200 flex items-center justify-center shadow-sm active:scale-95 transition-transform"
            title="Lihat Profile"
          >
            {headerAvatar ? (
              <img src={headerAvatar} alt={inspectorName || 'Profile'} className="w-full h-full object-cover" />
            ) : (
              <span className="text-teal-700 font-bold font-display text-xs">{inspectorName ? inspectorName.charAt(0).toUpperCase() : '?'}</span>
            )}
          </button></div></div></header>

      {/* Main Content Area */}
      <main className="@container flex-1 flex flex-col w-full h-full bg-transparent">
        
      <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
              <AnimatePresence mode="wait">
<Routes location={location} key={location.pathname}>
  <Route path="/" element={<HomeScreen inspectorName={inspectorName!} inspectorNik={inspectorNik!} onNav={handleNav} userPt={userProfile?.pt} />} />
  <Route path="/chat" element={<ChatScreen inspectorName={inspectorName!} inspectorNik={inspectorNik!} />} />
  <Route path="/inspect" element={<InspectionScreen inspectorName={inspectorName!} inspectorNik={inspectorNik!} equipmentCategories={equipmentCategories || []} reloadData={fetchMasterData} loading={loadingEquipments} />} />
  <Route path="/downtime" element={<DowntimePage inspectorNik={inspectorNik!} equipmentCategories={equipmentCategories || []} />} />
  <Route path="/create-wo" element={<CreateWOScreen inspectorName={inspectorName!} inspectorNik={inspectorNik!} equipmentCategories={equipmentCategories || []} />} />
  <Route path="/create-internal-ticket" element={<CreateInternalTicketScreen inspectorName={inspectorName!} inspectorNik={inspectorNik!} onBack={() => handleNav('home')} />} />
  <Route path="/wo-list" element={<WOListScreen inspectorName={inspectorName!} inspectorNik={inspectorNik!} />} />
  <Route path="/ticket" element={<TicketScreen inspectorName={inspectorName!} inspectorNik={inspectorNik!} />} />
  <Route path="/weekly-inspection" element={<WeeklyInspectionScreen inspectorName={inspectorName!} inspectorNik={inspectorNik!} inspectorJabatan={userProfile?.jabatan || ""} onInspectionComplete={(msg) => setGlobalWaMessage(msg)} />} />
  <Route path="/pemantauan" element={<PemantauanScreen inspectorName={inspectorName!} inspectorNik={inspectorNik!} />} />
  <Route path="/monitoring" element={<MonitoringDashboard inspectorNik={inspectorNik!} />} />
  <Route path="/quiz-admin" element={<QuizAdminScreen userSection={userProfile?.section || ''} onBack={() => handleNav('home')} />} />
  <Route path="/quiz" element={<QuizScreen inspectorName={inspectorName!} inspectorNik={inspectorNik!} userSection={userProfile?.section || ''} onBack={() => handleNav('home')} />} />
  <Route path="/apd-input" element={<ApdInputScreen />} />
  <Route path="/apd-settings" element={<ApdSettingsScreen />} />
  <Route path="/apd-monitoring" element={<ApdMonitoringScreen />} />
  <Route path="/induksi" element={<InduksiScreen />} />
  <Route path="/preplab-cloud" element={<PreplabCloudScreen onBack={() => handleNav('home')} userProfile={userProfile} inspectorNik={inspectorNik!} inspectorName={inspectorName!} />} />
  <Route path="/manual" element={<UserManualScreen onBack={() => handleNav('home')} />} />
  <Route path="/employee-database" element={<EmployeeDatabaseScreen inspectorNik={inspectorNik!} onBack={() => handleNav('home')} />} />
  <Route path="/roster-admin" element={<RosterAdminScreen />} />
  <Route path="/settings" element={<SettingsScreen inspectorName={inspectorName} inspectorNik={inspectorNik} onLogoutKaryawan={handleLogoutKaryawan} onOpenThemeModal={() => setShowGlobalThemeModal(true)} />} />
  <Route path="/admin-dashboard" element={<AdminDashboard inspectorNik={inspectorNik!} />} />
  <Route path="/sap-dashboard" element={<SapDashboard inspectorNik={inspectorNik!} />} />
  <Route path="/adm-dashboard" element={<AdmDashboard />} />
  <Route path="/pelanggaran-dashboard" element={<PelanggaranDashboard />} />
  <Route path="/bulletin-prep-lab" element={<BulletinBoard inspectorNik={inspectorNik!} inspectorName={inspectorName!} departmentName="Prep & Lab" />} />
  <Route path="/bulletin-dept" element={userDept && userDept !== 'ALL' ? <BulletinBoard inspectorNik={inspectorNik!} inspectorName={inspectorName!} departmentName={userDept} /> : <Navigate to="/" />} />
  <Route path="/bulletin-dept/:deptName" element={userDept === 'ALL' ? <BulletinBoard inspectorNik={inspectorNik!} inspectorName={inspectorName!} departmentName={location.pathname.split("/").pop() || ""} /> : <Navigate to="/" />} />
  <Route path="/agenda" element={<AgendaDashboard key="agenda" inspectorNik={inspectorNik!} inspectorName={inspectorName!} userDept={userDept || undefined} />} />
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
  </AnimatePresence>
      </Suspense>
      </main>
      </div>
      </div>

      {/* Bottom Nav */}
      <AnimatePresence>
        {showBulletinMenu && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-slate-900/40 backdrop-blur-md p-4" 
            onClick={() => setShowBulletinMenu(false)}
          >
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: "0%", opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl border border-slate-100" 
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto -mt-2 mb-4 sm:hidden" />
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold text-lg text-slate-800">Pilih Buletin</h3>
                <button onClick={() => setShowBulletinMenu(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-800 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <button 
                  onClick={() => { handleNav('bulletin-prep-lab'); setShowBulletinMenu(false); }}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${activeTab === 'bulletin-prep-lab' ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50 text-slate-700'}`}
                >
                  <div className={`p-2 rounded-lg ${activeTab === 'bulletin-prep-lab' ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-500'}`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-left flex-1">Prep & Lab</span>
                </button>
                {userDept === 'ALL' ? (
                  <>
                    {['Administration', 'Preparation', 'Laboratory', 'Maintenance', 'Quality Assurance', 'Inventory Control'].map(dept => (
                      <button 
                        key={dept}
                        onClick={() => { navigate('/bulletin-dept/' + dept); setShowBulletinMenu(false); }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                        style={{ color: 'var(--text-main)' }}
                      >
                        <div className="w-10 h-10 rounded-full flex items-center justify-center opacity-80" style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>
                          <Building2 className="w-5 h-5" />
                        </div>
                        <span className="font-medium text-left flex-1">{dept}</span>
                      </button>
                    ))}
                  </>
                ) : (userDept && (userDept as string) !== 'Prep & Lab') && (
                  <button 
                    onClick={() => { navigate('/bulletin-dept'); setShowBulletinMenu(false); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                    style={{ color: 'var(--text-main)' }}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center opacity-80" style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>
                      <Building2 className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-left flex-1">{userDept}</span>
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {!isCrewRole && (
        <nav className="fixed bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 z-40 flex items-center justify-around h-[4.5rem] pb-safe" style={{ backgroundColor: 'var(--bg-main)' }}>
          <NavItem 
            icon={<Home className="w-5 h-5" />}
            label="Home" 
            active={activeTab === 'home'} 
            onClick={() => handleNav('home')} 
          />
          <NavItem icon={<FileText className="w-5 h-5" />} label="Buletin" active={activeTab.startsWith('bulletin')} onClick={() => setShowBulletinMenu(true)} />
          <NavItem 
            icon={<Cloud className="w-5 h-5" />} 
            label="Cloud" 
            active={activeTab === 'preplab-cloud'} 
            onClick={() => handleNav('preplab-cloud')} 
          />

          <NavItem 
            icon={<Settings className="w-5 h-5" />} 
            label="Settings" 
            active={activeTab === 'settings'} 
            onClick={() => handleNav('settings')} 
          />
          {(inspectorNik === '02D25000055' || inspectorNik === 'preplabadmin') && (
            <NavItem 
              icon={<Settings className="w-5 h-5" />} 
              label="Developer" 
              active={activeTab === 'admin-dashboard'} 
              onClick={() => handleNav('admin-dashboard')} 
            />
          )}
        </nav>
      )}
      {/* Profile Drawer */}
      <AnimatePresence>
        {showProfileScreen && (
          <ProfileScreen 
            inspectorName={inspectorName}
            inspectorNik={inspectorNik}
            onBack={() => setShowProfileScreen(false)}
            onLogout={() => { setShowProfileScreen(false); handleLogoutKaryawan(); }}
          />
        )}
      </AnimatePresence>

      {/* Global WhatsApp Modal — survives navigation */}
      <WhatsAppModal
        isOpen={!!globalWaMessage}
        onClose={() => setGlobalWaMessage('')}
        messageText={globalWaMessage}
        title="Laporan Inspeksi Berhasil"
        description="Kirim laporan ke supervisor via WhatsApp."
      />

    </div>
  );
}
function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-16 h-full transition-all ${active ? 'text-teal-600 font-semibold' : 'text-slate-400 hover:text-slate-600'}`}
    >
      <div className={`${active ? 'scale-110 mb-1' : 'scale-100 mb-1'} transition-transform`}>{icon}</div>
      <span className="text-[10px] whitespace-nowrap">{label}</span>
    </button>
  );
}
