import { NotificationBell } from "./components/notification-bell";
import React, { useState, useEffect, Suspense, lazy, useRef, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import { Cloud, Activity, Settings, ShieldCheck, CheckCircle2, AlertTriangle, LogOut, FileSpreadsheet, Check, Wrench, ChevronRight, Image as ImageIcon, Camera, X, Code2, ChevronLeft, UploadCloud, Layers, Home, ClipboardList, CheckSquare, PlusCircle, ListTodo, ThermometerSun, LineChart, ClipboardCheck, User, Menu, Calendar, Utensils, FileText, Eye, BriefcaseMedical, Building2, LayoutDashboard, MessageCircle, Sparkles, Lock, KeyRound, FlaskConical, Shield, ArrowRight } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { appendRowsToSheet, getDowntimeRecords,updateDowntimeRepair, getEmployees, loginEmployee, getEquipments, ToolRecord, updateToolPhotoUrl, uploadPhotoToDrive } from './sheets-api';
import { Button, Card, Input, Select, Textarea } from './components/ui';
import { Toaster, toast } from 'sonner';
import ThemeModal from './components/ThemeModal';
import { Palette } from 'lucide-react';
import { initAuth, googleSignIn } from './google-auth';
import { WhatsAppModal } from './components/whatsapp-modal';
import { P5MNotificationModal } from './components/p5m-notification-modal';
import { GroupReportScreen, GroupReportFloatingWidget } from './components/GroupReportScreen';



















function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T } | any>
) {
  return lazy(async () => {
    try {
      const module = await factory();
      return module.default ? module : { default: module };
    } catch (error: any) {
      console.warn('[DynamicImport] Chunk fetch failed, attempting auto-recovery...', error);
      const reloadKey = 'preplab_chunk_reload_count';
      const count = parseInt(sessionStorage.getItem(reloadKey) || '0', 10);
      if (count < 2) {
        sessionStorage.setItem(reloadKey, String(count + 1));
        window.location.reload();
        return new Promise(() => {});
      }
      throw error;
    }
  });
}

const CreateWOScreen = lazyWithRetry(() => import('./components/create-wo-screen').then(m => ({ default: m.CreateWOScreen })));
const CreateInternalTicketScreen = lazyWithRetry(() => import('./components/create-internal-ticket-screen').then(m => ({ default: m.CreateInternalTicketScreen })));
const WOListScreen = lazyWithRetry(() => import('./components/wo-list-screen').then(m => ({ default: m.WOListScreen })));
const TicketScreen = lazyWithRetry(() => import('./components/ticket-screen').then(m => ({ default: m.TicketScreen })));
const PemantauanScreen = lazyWithRetry(() => import('./components/pemantauan-screen').then(m => ({ default: m.PemantauanScreen })));
const ProfileScreen = lazyWithRetry(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const RosterAdminScreen = lazyWithRetry(() => import('./components/roster-admin-screen').then(m => ({ default: m.RosterAdminScreen })));
const MonitoringDashboard = lazyWithRetry(() => import('./components/monitoring-dashboard').then(m => ({ default: m.MonitoringDashboard })));
const WeeklyInspectionScreen = lazyWithRetry(() => import('./components/weekly-inspection-screen').then(m => ({ default: m.WeeklyInspectionScreen })));
const ChatScreen = lazyWithRetry(() => import('./components/ChatScreen').then(m => ({ default: m.default })));
const ApdInputScreen = lazyWithRetry(() => import('./components/apd-input-screen').then(m => ({ default: m.ApdInputScreen })));
const ApdSettingsScreen = lazyWithRetry(() => import('./components/apd-settings-screen').then(m => ({ default: m.ApdSettingsScreen })));
const ApdMonitoringScreen = lazyWithRetry(() => import('./components/apd-monitoring-screen').then(m => ({ default: m.ApdMonitoringScreen })));
const InduksiScreen = lazyWithRetry(() => import('./components/induksi-screen').then(m => ({ default: m.InduksiScreen })));
const HomeScreen = lazyWithRetry(() => import('./components/home-screen').then(m => ({ default: m.HomeScreen })));
const QuizScreen = lazyWithRetry(() => import('./components/quiz-screen').then(m => ({ default: m.QuizScreen })));
const QuizAdminScreen = lazyWithRetry(() => import('./components/quiz-admin-screen').then(m => ({ default: m.QuizAdminScreen })));
const InspectionScreen = lazyWithRetry(() => import('./components/inspection-screen').then(m => ({ default: m.InspectionScreen })));
const DowntimePage = lazyWithRetry(() => import('./pages/DowntimePage').then(m => ({ default: m.DowntimePage })));
const SettingsScreen = lazyWithRetry(() => import('./components/settings-screen').then(m => ({ default: m.SettingsScreen })));
const PreplabCloudScreen = lazyWithRetry(() => import('./components/preplab-cloud-screen').then(m => ({ default: m.PreplabCloudScreen })));
const AdminDashboard = lazyWithRetry(() => import('./components/admin-dashboard').then(m => ({ default: m.AdminDashboard })));
const SapDashboard = lazyWithRetry(() => import('./components/sap-dashboard').then(m => ({ default: m.SapDashboard })));
const AgendaDashboard = lazyWithRetry(() => import('./components/agenda-dashboard').then(m => ({ default: m.AgendaDashboard })));
const AdmDashboard = lazyWithRetry(() => import('./components/adm-dashboard').then(m => ({ default: m.AdmDashboard })));
const PelanggaranDashboard = lazyWithRetry(() => import('./components/pelanggaran-dashboard').then(m => ({ default: m.PelanggaranDashboard })));
const P5MScreen = lazyWithRetry(() => import('./components/p5m-screen').then(m => ({ default: m.P5MScreen })));
const BulletinBoard = lazyWithRetry(() => import('./components/bulletin-board').then(m => ({ default: m.BulletinBoard })));
const UserManualScreen = lazyWithRetry(() => import('./components/user-manual-screen').then(m => ({ default: m.UserManualScreen })));
const EmployeeDatabaseScreen = lazyWithRetry(() => import('./components/employee-database-screen').then(m => ({ default: m.EmployeeDatabaseScreen })));
const WOMaintenanceDashboard = lazyWithRetry(() => import('./components/wo-maintenance-dashboard').then(m => ({ default: m.WOMaintenanceDashboard })));
const FeedbackSupportScreen = lazyWithRetry(() => import('./components/feedback-support-screen').then(m => ({ default: m.FeedbackSupportScreen })));
const EasterEggGame = lazyWithRetry(() => import('./components/easter-egg-game').then(m => ({ default: m.EasterEggGame })));

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
  const isBulletin = location.pathname.startsWith('/bulletin');

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

  const [developerList, setDeveloperList] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/developers')
      .then(res => res.json())
      .then(json => {
        if (json.status === 'success' && Array.isArray(json.data)) {
          setDeveloperList(json.data);
        }
      })
      .catch(() => {});
  }, []);

  const isDeveloper = React.useMemo(() => {
    if (inspectorNik === '02D25000055' || inspectorNik === '02D24000043' || inspectorNik === 'preplabadmin') return true;
    return developerList.some(d => d.nik === inspectorNik);
  }, [inspectorNik, developerList]);

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
  const [userThemes, setUserThemes] = useState<any>(() => {
    try {
      const savedNik = localStorage.getItem('p2h_inspector_nik');
      const profile = localStorage.getItem('p2h_inspector_profile');
      const nik = savedNik || (profile ? JSON.parse(profile).nik : null);
      const storageKey = nik ? `preplab_user_themes_${nik}` : 'preplab_user_themes_guest';
      const cached = localStorage.getItem(storageKey) || localStorage.getItem('preplab_user_themes_guest');
      const activeColorsCached = localStorage.getItem('preplab_active_theme_colors');
      
      let baseColors: any = null;
      if (activeColorsCached) {
        try { baseColors = JSON.parse(activeColorsCached); } catch(e) {}
      }

      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.morning || parsed.afternoon || parsed.evening) {
          const fallback = parsed.morning || parsed.afternoon || parsed.evening || baseColors;
          return {
            morning: parsed.morning || fallback,
            afternoon: parsed.afternoon || fallback,
            evening: parsed.evening || fallback
          };
        }
      }

      if (baseColors) {
        return {
          morning: baseColors,
          afternoon: baseColors,
          evening: baseColors
        };
      }
    } catch(e) {}
    return {
      morning: { '--bg-main': '#FFFFFF', '--primary': '#2A9D8F', '--primary-hover': '#23A3B4', '--accent': '#E9930D', '--card-bg': '#FFFFFF', '--text-main': '#333333', '--text-muted': '#4A4A4A', '--border-main': '#DCE8F8', '--input-bg': '#FFFFFF', '--bubble-color': '#E9930D', '--header-bg': '#FFFFFF', '--header-text': '#1E293B', '--footer-selected': '#2A9D8F' },
      afternoon: { '--bg-main': '#FFFFFF', '--primary': '#2A9D8F', '--primary-hover': '#23A3B4', '--accent': '#E9930D', '--card-bg': '#FFFFFF', '--text-main': '#333333', '--text-muted': '#4A4A4A', '--border-main': '#DCE8F8', '--input-bg': '#FFFFFF', '--bubble-color': '#E9930D', '--header-bg': '#FFFFFF', '--header-text': '#1E293B', '--footer-selected': '#2A9D8F' },
      evening: { '--bg-main': '#0F172A', '--primary': '#2A9D8F', '--primary-hover': '#23A3B4', '--accent': '#E9930D', '--card-bg': '#1E293B', '--text-main': '#F8FAFC', '--text-muted': '#94A3B8', '--border-main': '#334155', '--input-bg': '#0F172A', '--bubble-color': '#E9930D', '--header-bg': '#1E293B', '--header-text': '#F8FAFC', '--footer-selected': '#2A9D8F' }
    };
  });

  const checkTimeAndSetTheme = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setCurrentMode('morning');
    else if (hour >= 12 && hour < 18) setCurrentMode('afternoon');
    else setCurrentMode('evening');
  };

  const applyThemeToDOM = (colors: any) => {
    if (!colors) return;
    let actualColors = colors;
    if (typeof actualColors === 'string') {
      try { actualColors = JSON.parse(actualColors); } catch(e) {}
    }
    if (!actualColors || typeof actualColors !== 'object') return;
    const root = document.documentElement;
    Object.entries(actualColors).forEach(([key, value]) => {
      if (typeof key === 'string' && key.startsWith('--') && value) {
        root.style.setProperty(key, value as string);
      }
    });
  };

  const handleThemeUpdated = (mode: string, colors: any, applyToAll?: boolean) => {
    setUserThemes((prev: any) => {
      let updated;
      if (applyToAll || applyToAll === undefined) {
        updated = {
          morning: colors,
          afternoon: colors,
          evening: colors
        };
      } else {
        updated = {
          ...prev,
          [mode]: colors
        };
      }
      const nik = inspectorNik || localStorage.getItem('p2h_inspector_nik');
      if (nik) {
        localStorage.setItem(`preplab_user_themes_${nik}`, JSON.stringify(updated));
      }
      localStorage.setItem('preplab_user_themes_guest', JSON.stringify(updated));
      localStorage.setItem('preplab_active_theme_colors', JSON.stringify(colors));
      applyThemeToDOM(colors);
      return updated;
    });
  };

  useEffect(() => {
    checkTimeAndSetTheme();
    const interval = setInterval(checkTimeAndSetTheme, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (userThemes && userThemes[currentMode]) {
      applyThemeToDOM(userThemes[currentMode]);
    }
  }, [currentMode, userThemes]);

  useEffect(() => {
    const loadThemes = async () => {
      const nik = inspectorNik || localStorage.getItem('p2h_inspector_nik');
      const storageKey = nik ? `preplab_user_themes_${nik}` : 'preplab_user_themes_guest';
      const cached = localStorage.getItem(storageKey) || localStorage.getItem('preplab_user_themes_guest');
      const activeCached = localStorage.getItem('preplab_active_theme_colors');
      
      if (activeCached) {
        try {
          const parsedActive = JSON.parse(activeCached);
          if (parsedActive && typeof parsedActive === 'object') {
            applyThemeToDOM(parsedActive);
          }
        } catch(e) {}
      }

      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setUserThemes(parsed);
          const hour = new Date().getHours();
          const mode = (hour >= 5 && hour < 12) ? 'morning' : (hour >= 12 && hour < 18) ? 'afternoon' : 'evening';
          if (!activeCached && parsed[mode]) applyThemeToDOM(parsed[mode]);
        } catch(e) {}
      }

      if (!nik) return;
      try {
        const res = await fetch(`/api/themes/${nik}`);
        const json = await res.json();
        if (json.status === 'success' && json.data && Object.keys(json.data).length > 0) {
          setUserThemes((prev: any) => {
            const firstAvailable = json.data.morning?.colors || json.data.afternoon?.colors || json.data.evening?.colors;
            const nextThemes = {
              morning: json.data.morning?.colors || firstAvailable || prev.morning,
              afternoon: json.data.afternoon?.colors || firstAvailable || prev.afternoon,
              evening: json.data.evening?.colors || firstAvailable || prev.evening,
            };
            localStorage.setItem(`preplab_user_themes_${nik}`, JSON.stringify(nextThemes));
            return nextThemes;
          });
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


  
  const handleNav = (tab: string) => {
    if (tab === 'home' || tab === '' || tab === '/') navigate('/');
    else navigate('/' + tab.replace(/^\//, ''));
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate('/');
    }
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
             body: JSON.stringify({ identifier: inputNik, nik: inputNik })
         });
         const data = await res.json();
         if (data.status === 'success') {
             const isCrew = data.employee?.jabatan?.toLowerCase().includes('crew');
             const validNik = data.employee?.nik || inputNik;
             const validUsername = data.employee?.username || '';
             
             if (isCrew) {
                 toast.success("Login otomatis sebagai Crew!");
                 setInspectorNik(validNik);
                 setInspectorName(data.employee.name);
                 localStorage.setItem('p2h_inspector_nik', validNik);
                 localStorage.setItem('p2h_inspector_name', data.employee.name);
                 localStorage.setItem('p2h_inspector_jabatan', data.employee.jabatan || 'Crew');
                 localStorage.setItem('p2h_inspector_profile', JSON.stringify(data.employee));
                 if (validUsername) localStorage.setItem('p2h_inspector_username', validUsername);
                 setLoginStep('nik');
                 handleNav('quiz');
             } else if (data.firstLoginComplete) {
                 setLoginStep('password');
             } else {
                 setLoginStep('setup');
                 toast.info("Ini adalah login pertama Anda. Silakan setup password.");
             }
         } else {
             toast.error(data.message || 'NIK atau Username tidak ditemukan');
         }
      } else if (loginStep === 'forgot') {
         const res = await fetch('/api/auth/reset-password', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ identifier: inputNik, nik: inputNik, email: forgotEmail, adminReset: false })
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
                 identifier: inputNik,
                 nik: inputNik, 
                 password: setupPassword1, 
                 email: setupEmail,
                 tanggalLahir: setupTanggalLahir 
             })
         });
         const data = await res.json();
         if (data.status === 'success') {
             toast.success("Setup berhasil!");
             const validNik = data.employee?.nik || inputNik;
             const validUsername = data.employee?.username || '';
             setInspectorNik(validNik);
             setInspectorName(data.employee.name);
             localStorage.setItem('p2h_inspector_nik', validNik);
             localStorage.setItem('p2h_inspector_name', data.employee.name);
             localStorage.setItem('p2h_inspector_jabatan', data.employee.jabatan || 'Crew');
             localStorage.setItem('p2h_inspector_profile', JSON.stringify(data.employee));
             if (validUsername) localStorage.setItem('p2h_inspector_username', validUsername);
             setLoginStep('nik');
         } else {
             toast.error(data.message);
         }
      } else if (loginStep === 'password') {
          // Standard login
          const res = await fetch('/api/auth/login', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ identifier: inputNik, nik: inputNik, password: passwordInput })
          });
          const data = await res.json();
          
          if (data.status === 'success') {
              if (data.requireSetup) {
                  setLoginStep('setup');
                  toast.info("Ini adalah login pertama Anda. Silakan setup password.");
              } else {
                  const validNik = data.employee.nik;
                  const validUsername = data.employee.username || '';
                  setInspectorNik(validNik);
                  setInspectorName(data.employee.name);
                  localStorage.setItem('p2h_inspector_nik', validNik);
                  localStorage.setItem('p2h_inspector_name', data.employee.name);
                  localStorage.setItem('p2h_inspector_jabatan', data.employee.jabatan || 'Crew');
                  localStorage.setItem('p2h_inspector_profile', JSON.stringify(data.employee));
                  if (validUsername) localStorage.setItem('p2h_inspector_username', validUsername);
                  toast.success("Login berhasil");
                  setLoginStep('nik');
                  setPasswordInput('');
              }
          } else {
             const errMsg = data.message || 'Error login';
             if (errMsg.toLowerCase().includes('password') || errMsg.toLowerCase().includes('nik') || errMsg.toLowerCase().includes('username')) {
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
    localStorage.removeItem('p2h_inspector_username');
    localStorage.removeItem('p2h_inspector_jabatan');
    localStorage.removeItem('p2h_inspector_profile');
    sessionStorage.removeItem('username_prompted');
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
  if (!inspectorNik && !inspectorName) {
    return (
      <div className="min-h-screen w-full bg-[#080c14] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden selection:bg-teal-500 selection:text-white font-sans">
        
        {/* Ambient Glow Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-teal-500/15 rounded-full blur-[120px] pointer-events-none animate-pulse duration-1000" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[550px] h-[550px] bg-emerald-500/15 rounded-full blur-[140px] pointer-events-none animate-pulse duration-700" />
        <div className="absolute top-[40%] right-[25%] w-[350px] h-[350px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Subtle Tech Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.12] pointer-events-none" 
          style={{
            backgroundImage: `radial-gradient(#2dd4bf 1px, transparent 1px)`,
            backgroundSize: '32px 32px'
          }}
        />

        {/* Top Security Status Bar */}
        <div className="relative z-10 mb-6 flex items-center gap-3 px-4 py-1.5 rounded-full bg-slate-900/80 border border-teal-500/20 backdrop-blur-md text-[11px] font-mono text-teal-300/90 shadow-lg">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
          </span>
          <span>PREPLAB ENTERPRISE GATEWAY</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">HARITA NICKEL • TBP & GPS</span>
        </div>

        {/* Main Glassmorphic Login Card */}
        <div className="relative z-10 w-full max-w-md bg-[#0d1527]/85 backdrop-blur-2xl rounded-3xl border border-teal-500/25 shadow-[0_0_60px_-15px_rgba(20,184,166,0.3)] p-8 sm:p-10 space-y-6 overflow-hidden">
          
          {/* Card Top Light Accent Streak */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-400 to-transparent opacity-80" />
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-40 h-12 bg-teal-500/20 blur-xl pointer-events-none" />

          {/* Logo & Brand Emblem */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="relative group">
              <div className="w-20 h-20 rounded-3xl bg-slate-950/80 border border-teal-400/30 p-2 flex items-center justify-center shadow-2xl shadow-teal-500/20 group-hover:scale-105 transition-all duration-300 backdrop-blur-md">
                <img 
                  src="/preplab-logo.png" 
                  alt="Prep & Lab Logo" 
                  className="w-full h-full object-contain filter drop-shadow-[0_0_12px_rgba(249,115,22,0.3)]" 
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 backdrop-blur-md shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-white via-teal-100 to-teal-400 bg-clip-text text-transparent">
                PREP &amp; LAB PORTAL
              </h1>
              <p className="text-xs text-slate-400 mt-1 font-medium tracking-wide">
                PRECISION IN EVERY ELEMENT • HARITA NICKEL
              </p>
            </div>
          </div>

          {/* Form Content per Step */}
          <form onSubmit={handleNikLogin} className="space-y-4 pt-2 text-left">
            {loginStep === 'nik' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-teal-400" />
                    <span>NIK atau Username</span>
                  </label>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Contoh: 02D... atau budi_lab"
                      value={nikInput}
                      onChange={e => setNikInput(e.target.value)}
                      required
                      autoFocus
                      className="w-full px-4 py-3 bg-slate-950/70 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 font-mono text-center text-sm sm:text-base tracking-wider focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all shadow-inner"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 text-center pt-0.5">
                    Gunakan NIK resmi karyawan atau username yang terdaftar
                  </p>
                </div>

                <button 
                  type="submit" 
                  disabled={isVerifyingNik || !nikInput.trim()} 
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-sm tracking-wide transition-all shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isVerifyingNik ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Mengecek Akun...</span>
                    </>
                  ) : (
                    <>
                      <span>Lanjut Masuk</span>
                      <ArrowRight className="w-4 h-4 text-slate-950" />
                    </>
                  )}
                </button>
              </div>
            )}

            {loginStep === 'password' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-teal-950/60 border border-teal-700/50 flex items-center justify-center text-teal-400">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Akun Terpilih</span>
                      <span className="text-xs font-bold text-white font-mono">{nikInput}</span>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setLoginStep('nik')} 
                    className="text-xs text-teal-400 hover:text-teal-300 font-semibold underline underline-offset-2 cursor-pointer"
                  >
                    Ganti
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-teal-400" />
                    <span>Password Akun</span>
                  </label>
                  <input 
                    type="password"
                    placeholder="••••••••"
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-4 py-3 bg-slate-950/70 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all shadow-inner font-sans"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isVerifyingNik || !passwordInput.trim()} 
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-sm tracking-wide transition-all shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isVerifyingNik ? (
                    <>
                      <Activity className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Verifikasi Password...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4 text-slate-950" />
                      <span>Masuk ke Sistem</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  <button 
                    type="button" 
                    onClick={() => setLoginStep('forgot')} 
                    className="text-xs text-slate-400 hover:text-teal-400 transition-colors cursor-pointer"
                  >
                    Lupa Password?
                  </button>
                </div>
              </div>
            )}

            {loginStep === 'setup' && (
              <div className="space-y-3.5 animate-in fade-in duration-300">
                <div className="p-2.5 rounded-xl bg-teal-950/40 border border-teal-500/30 text-teal-300 text-xs">
                  <p className="font-bold flex items-center gap-1.5 mb-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                    <span>Setup Akun Pertama Kali</span>
                  </p>
                  <p className="text-[11px] text-teal-200/80">Lengkapi data di bawah untuk mengamankan akun Anda.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Email Aktif (Reset Password)</label>
                  <input 
                    type="email"
                    placeholder="nama@haritanickel.com"
                    value={setupEmail}
                    onChange={e => setSetupEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-lg text-white text-xs focus:outline-none focus:border-teal-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Tanggal Lahir (Verifikasi Identitas)</label>
                  <input 
                    type="date"
                    value={setupTanggalLahir}
                    onChange={e => setSetupTanggalLahir(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-lg text-white text-xs focus:outline-none focus:border-teal-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Password Baru</label>
                  <input 
                    type="password"
                    placeholder="Minimal 6 karakter"
                    value={setupPassword1}
                    onChange={e => setSetupPassword1(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-lg text-white text-xs focus:outline-none focus:border-teal-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Konfirmasi Password Baru</label>
                  <input 
                    type="password"
                    placeholder="Ulangi password baru"
                    value={setupPassword2}
                    onChange={e => setSetupPassword2(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-lg text-white text-xs focus:outline-none focus:border-teal-400"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isVerifyingNik} 
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-xs tracking-wide transition-all shadow-md active:scale-95 cursor-pointer mt-2"
                >
                  {isVerifyingNik ? 'Menyimpan...' : 'Simpan Password & Profil'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setLoginStep('nik')} 
                  className="w-full py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
              </div>
            )}

            {loginStep === 'forgot' && (
              <div className="space-y-3.5 animate-in fade-in duration-300">
                <div className="p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-xs">
                  <p className="font-bold mb-0.5">Reset Password Mandiri</p>
                  <p className="text-[11px] text-indigo-200/80">Masukkan email aktif yang terdaftar pada akun Anda.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Nomor Induk Karyawan (NIK)</label>
                  <input 
                    type="text"
                    value={nikInput}
                    disabled
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 font-mono text-xs cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Email Terdaftar</label>
                  <input 
                    type="email"
                    placeholder="nama@haritanickel.com"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700/80 rounded-lg text-white text-xs focus:outline-none focus:border-teal-400"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isVerifyingNik} 
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-teal-500 hover:from-indigo-400 hover:to-teal-400 text-white font-bold text-xs tracking-wide transition-all shadow-md active:scale-95 cursor-pointer mt-2"
                >
                  {isVerifyingNik ? 'Memproses...' : 'Kirim Link Reset'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setLoginStep('password')} 
                  className="w-full py-2 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
              </div>
            )}
          </form>

          {/* Bottom Trust Badge */}
          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span className="flex items-center gap-1 text-slate-400">
              <Shield className="w-3 h-3 text-teal-400" />
              <span>SSL 256-Bit Encrypted</span>
            </span>
            <span>v2.6 Enterprise</span>
          </div>

        </div>

        {/* Global Footer Motto */}
        <div className="relative z-10 mt-6 text-center text-slate-500 text-xs">
          <p className="font-semibold text-slate-400">Divisi Quality Assurance & Laboratorium • Harita Nickel</p>
          <p className="text-[11px] text-slate-600 mt-0.5">Safety • Precision • Integrity • Continuous Improvement</p>
        </div>

      </div>
    );
  }


  return (
    <div className="flex w-full min-h-[100dvh] overflow-hidden" style={{ backgroundColor: isBulletin ? '#1e1e1e' : 'var(--bg-main, #F4F7F6)' }}>
      <div 
        className={`flex-1 relative transition-all duration-300 overflow-x-hidden overflow-y-auto h-[100dvh] ${showProfileScreen ? 'md:mr-[400px] lg:mr-[480px]' : ''}`}
        style={{ backgroundColor: isBulletin ? '#1e1e1e' : 'var(--bg-main, #F4F7F6)', color: isBulletin ? '#e2e8f0' : 'var(--text-main, #333)' }}
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
      <header 
        className={`px-4 md:px-6 lg:px-8 py-3 sticky top-0 z-50 backdrop-blur-md border-b w-full flex justify-center transition-colors ${isBulletin ? 'bg-[#1e1e1e]/80 border-slate-800' : ''}`}
        style={{
          backgroundColor: isBulletin ? undefined : 'var(--header-bg, var(--card-bg, #FFFFFF))',
          borderColor: isBulletin ? undefined : 'var(--border-main, #E2E8F0)'
        }}
      >
        <div className="flex justify-between items-center w-full">
        <div className="flex items-center gap-3">
          {activeTab !== 'home' && (
            <button 
              onClick={handleBack} 
              className={`w-8 h-8 rounded-full border flex items-center justify-center shadow-sm active:scale-95 transition-transform ${isBulletin ? 'bg-[#2a2a2a] border-slate-700 text-slate-300' : 'border-slate-200'}`}
              style={{
                backgroundColor: isBulletin ? undefined : 'var(--input-bg, #ffffff)',
                borderColor: isBulletin ? undefined : 'var(--border-main, #e2e8f0)',
                color: isBulletin ? undefined : 'var(--text-main, #334155)'
              }}
              title="Kembali"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div 
            className="flex items-center gap-2.5 cursor-pointer group select-none"
            onClick={handleLogoClick}
            title="Klik untuk Easter Egg / Kembali ke Beranda"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-900/40 p-1 flex items-center justify-center border border-slate-700/50 shadow-sm group-hover:scale-105 transition-transform overflow-hidden">
               <img src="/preplab-logo.png" alt="Prep & Lab Logo" className="w-full h-full object-contain" onError={(e) => {
                 (e.target as HTMLImageElement).src = '/logo.png'; 
               }} />
            </div>
            <div className="flex flex-col">
              <span 
                className={`font-black font-display tracking-tight text-sm leading-tight group-hover:text-teal-500 transition-colors whitespace-nowrap ${isBulletin ? 'text-slate-100' : ''}`}
                style={{
                  color: isBulletin ? undefined : 'var(--header-text, var(--text-main, #0f172a))'
                }}
              >
                PREP &amp; LAB
              </span>
              <span className="text-[9px] font-bold tracking-wider uppercase text-teal-600 dark:text-teal-400 leading-none">
                HARITA NICKEL
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell userNik={inspectorNik || undefined} userName={inspectorName || undefined} />
          <button 
            onClick={() => setShowProfileScreen(true)}
            className="w-8 h-8 rounded-full overflow-hidden border flex items-center justify-center shadow-sm active:scale-95 transition-transform"
            style={{
              backgroundColor: 'var(--input-bg, #e6fffa)',
              borderColor: 'var(--border-main, #99f6e4)',
              color: 'var(--primary, #0f766e)'
            }}
            title="Lihat Profile"
          >
            {headerAvatar ? (
              <img src={headerAvatar} alt={inspectorName || 'Profile'} className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold font-display text-xs" style={{ color: 'var(--primary, #0f766e)' }}>{inspectorName ? inspectorName.charAt(0).toUpperCase() : '?'}</span>
            )}
          </button></div></div></header>

      {/* Main Content Area */}
      <main className="@container flex-1 flex flex-col w-full h-full bg-transparent">
        
      <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
              <AnimatePresence mode="wait">
<Routes location={location} key={location.pathname}>
  <Route path="/" element={<HomeScreen inspectorName={inspectorName!} inspectorNik={inspectorNik!} onNav={handleNav} userPt={userProfile?.pt} />} />
  <Route path="/chat" element={<GroupReportScreen inspectorName={inspectorName!} inspectorNik={inspectorNik!} inspectorRole={userProfile?.jabatan} inspectorSection={userProfile?.section} />} />
  <Route path="/group-reports" element={<GroupReportScreen inspectorName={inspectorName!} inspectorNik={inspectorNik!} inspectorRole={userProfile?.jabatan} inspectorSection={userProfile?.section} />} />
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
  <Route path="/settings" element={<SettingsScreen inspectorName={inspectorName} inspectorNik={inspectorNik} onLogoutKaryawan={handleLogoutKaryawan} onOpenThemeModal={() => setShowGlobalThemeModal(true)} onNav={handleNav} />} />
  <Route path="/admin-dashboard" element={<AdminDashboard inspectorNik={inspectorNik!} />} />
  <Route path="/sap-dashboard" element={<SapDashboard inspectorNik={inspectorNik!} />} />
  <Route path="/adm-dashboard" element={<AdmDashboard />} />
  <Route path="/pelanggaran-dashboard" element={<PelanggaranDashboard />} />
  <Route path="/wo-maintenance-dashboard" element={<WOMaintenanceDashboard onBack={() => handleNav('home')} inspectorNik={inspectorNik!} />} />
  <Route path="/wo-dashboard" element={<WOMaintenanceDashboard onBack={() => handleNav('home')} inspectorNik={inspectorNik!} />} />
  <Route path="/bulletin/:pt" element={<BulletinBoard inspectorNik={inspectorNik!} inspectorName={inspectorName!} />} />
  <Route path="/bulletin" element={<Navigate to={`/bulletin/${userProfile?.pt || 'TBP'}`} replace />} />
  <Route path="/agenda" element={<AgendaDashboard key="agenda" inspectorNik={inspectorNik!} inspectorName={inspectorName!} userDept={userDept || undefined} />} />
  <Route path="/p5m" element={<P5MScreen onBack={() => handleNav('home')} userProfile={userProfile} />} />
  <Route path="/feedback-support" element={<FeedbackSupportScreen inspectorNik={inspectorNik!} inspectorName={inspectorName!} onBack={() => handleNav('home')} />} />
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
              className="w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl border" 
              style={{
                backgroundColor: 'var(--card-bg, #FFFFFF)',
                borderColor: 'var(--border-main, #E2E8F0)',
                color: 'var(--text-main, #1E293B)'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div 
                className="w-10 h-1 rounded-full mx-auto -mt-2 mb-4 sm:hidden"
                style={{ backgroundColor: 'var(--border-main, #E2E8F0)' }}
              />
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg font-display" style={{ color: 'var(--text-main, #1E293B)' }}>
                  Pilih Buletin
                </h3>
                <button 
                  onClick={() => setShowBulletinMenu(false)} 
                  className="p-2 rounded-full border transition-transform active:scale-95 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--input-bg, #FFFFFF)',
                    borderColor: 'var(--border-main, #E2E8F0)',
                    color: 'var(--text-muted, #64748B)'
                  }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <button 
                  onClick={() => { handleNav('bulletin/TBP'); setShowBulletinMenu(false); }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left shadow-2xs group cursor-pointer"
                  style={{
                    backgroundColor: location.pathname.includes('/bulletin/TBP') ? 'var(--input-bg, #FFFFFF)' : 'var(--card-bg, #FFFFFF)',
                    borderColor: location.pathname.includes('/bulletin/TBP') ? 'var(--primary, #2A9D8F)' : 'var(--border-main, #E2E8F0)',
                    color: 'var(--text-main, #1E293B)'
                  }}
                >
                  <div 
                    className="p-2.5 rounded-xl transition-colors shrink-0"
                    style={{
                      backgroundColor: 'var(--input-bg, rgba(42,157,143,0.1))',
                      color: 'var(--primary, #2A9D8F)'
                    }}
                  >
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-sm flex-1">PT Trimegah Bangun Persada (TBP / GPS)</span>
                </button>
                <button 
                  onClick={() => { handleNav('bulletin/GTS'); setShowBulletinMenu(false); }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left shadow-2xs group cursor-pointer"
                  style={{
                    backgroundColor: location.pathname.includes('/bulletin/GTS') ? 'var(--input-bg, #FFFFFF)' : 'var(--card-bg, #FFFFFF)',
                    borderColor: location.pathname.includes('/bulletin/GTS') ? 'var(--primary, #2A9D8F)' : 'var(--border-main, #E2E8F0)',
                    color: 'var(--text-main, #1E293B)'
                  }}
                >
                  <div 
                    className="p-2.5 rounded-xl transition-colors shrink-0"
                    style={{
                      backgroundColor: 'var(--input-bg, rgba(42,157,143,0.1))',
                      color: 'var(--primary, #2A9D8F)'
                    }}
                  >
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-sm flex-1">PT Gane Tambang Sentosa (GTS)</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {!isCrewRole && (
        <nav 
          className="fixed bottom-0 w-full backdrop-blur-xl border-t z-40 flex items-center justify-around h-[4.5rem] pb-safe transition-colors" 
          style={{ 
            backgroundColor: 'var(--card-bg, var(--bg-main, #FFFFFF))',
            borderColor: 'var(--border-main, #E2E8F0)'
          }}
        >
          <NavItem 
            icon={<Home className="w-5 h-5" />}
            label="Home" 
            active={activeTab === 'home'} 
            onClick={() => handleNav('home')} 
          />
          <NavItem 
            icon={<FileText className="w-5 h-5" />} 
            label="Buletin" 
            active={activeTab.startsWith('bulletin')} 
            onClick={() => { 
              if (userDept === 'ALL') {
                setShowBulletinMenu(true);
              } else {
                handleNav(`bulletin/${userProfile?.pt || 'TBP'}`);
              }
            }} 
          />
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
          {isDeveloper && (
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

      {/* Global P5M Assignment Notification Modal */}
      <P5MNotificationModal
        inspectorNik={inspectorNik}
        inspectorName={inspectorName}
      />

      {/* Global Floating Group Safety & PDF Widget (Bottom Right Corner) */}
      {inspectorNik && (
        <GroupReportFloatingWidget
          inspectorNik={inspectorNik}
          inspectorName={inspectorName || 'Inspector'}
          inspectorRole={userProfile?.jabatan}
          inspectorSection={userProfile?.section}
          isDeveloper={isDeveloper}
        />
      )}

    </div>
  );
}
function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-16 h-full transition-all ${active ? 'font-semibold' : 'opacity-60 hover:opacity-100'}`}
      style={{
        color: active ? 'var(--footer-selected, var(--primary, #2A9D8F))' : 'var(--text-muted, #94A3B8)'
      }}
    >
      <div className={`${active ? 'scale-110 mb-1' : 'scale-100 mb-1'} transition-transform`}>{icon}</div>
      <span className="text-[10px] whitespace-nowrap">{label}</span>
    </button>
  );
}
