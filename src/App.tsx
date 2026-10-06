import { NotificationBell } from "./components/notification-bell";
import React, { useState, useEffect, Suspense, lazy, useRef, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { registerPresence, pingPresence, unregisterPresence } from './lib/socketClient';

import { Cloud, Activity, Settings, ShieldCheck, CheckCircle2, AlertTriangle, LogOut, FileSpreadsheet, Check, Wrench, ChevronRight, Image as ImageIcon, Camera, X, Code2, ChevronLeft, UploadCloud, Layers, Home, ClipboardList, CheckSquare, PlusCircle, ListTodo, ThermometerSun, LineChart, ClipboardCheck, User, Menu, Calendar, Utensils, FileText, Eye, EyeOff, BriefcaseMedical, Building2, LayoutDashboard, LayoutGrid, MessageCircle, Sparkles, Lock, KeyRound, FlaskConical, Shield, ArrowRight, Receipt, ShieldAlert, Users, BarChart2, MessageSquare, Trophy, Maximize2, Minimize2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { appendRowsToSheet, getDowntimeRecords,updateDowntimeRepair, getEmployees, loginEmployee, getEquipments, ToolRecord, updateToolPhotoUrl, uploadPhotoToDrive } from './sheets-api';
import { Button, Card, Input, Select, Textarea } from './components/ui';
import { Toaster, toast } from 'sonner';
import ThemeModal from './components/ThemeModal';
import { Palette } from 'lucide-react';
import { initAuth, googleSignIn } from './google-auth';
import { WhatsAppModal } from './components/whatsapp-modal';
import { InspectionCompletionModal, InspectionCompletionData } from './components/InspectionCompletionModal';
import { GroupReportScreen } from './components/GroupReportScreen';
import { LogoutConfirmModal } from './components/LogoutConfirmModal';
import { PushNotificationPrompt } from './components/PushNotificationPrompt';
import { PromotionWelcomeModal } from './components/PromotionWelcomeModal';
import { GamificationAlertCenter } from './components/GamificationAlertCenter';
import { MeetingRoomDevModal } from './components/MeetingRoomDevModal';
import { FloatingFeedbackButton } from './components/FloatingFeedbackButton';
import { initFontSize } from './utils/fontSize';
import { formatAvatarUrl } from './lib/avatarUtils';

// Initialize portal-wide font scale on boot
initFontSize();



















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
const LeaderboardScreen = lazyWithRetry(() => import('./components/LeaderboardScreen').then(m => ({ default: m.LeaderboardScreen })));
const EasterEggGame = lazyWithRetry(() => import('./components/easter-egg-game').then(m => ({ default: m.EasterEggGame })));
const FinanceScreen = lazyWithRetry(() => import('./components/FinanceScreen').then(m => ({ default: m.FinanceScreen || m.default })));
const ModulesScreen = lazyWithRetry(() => import('./components/modules-screen').then(m => ({ default: m.ModulesScreen })));
const LogbookScreen = lazyWithRetry(() => import('./components/logbook-screen').then(m => ({ default: m.LogbookScreen })));
const ClinicScreen = lazyWithRetry(() => import('./components/clinic-screen').then(m => ({ default: m.ClinicScreen })));
import { ModulesDrawer } from './components/ModulesDrawer';
import { LabBotWidget } from './components/LabBotWidget';
import { HeaderModuleSearchBar } from './components/HeaderModuleSearchBar';
import { DailySplashScreen } from './components/DailySplashScreen';

export default function App() {

  // Global WhatsApp & Inspection Completion modal state — lifted here so it survives route changes
  const [globalWaMessage, setGlobalWaMessage] = useState('');
  const [inspectionCompletionData, setInspectionCompletionData] = useState<InspectionCompletionData | null>(null);

  // Listen for inspection completion modal open requests (e.g. from notification bell)
  useEffect(() => {
    const handleOpenCompletionModal = (e: any) => {
      if (e?.detail) {
        setInspectionCompletionData(e.detail);
        if (e.detail.waMessageText) {
          setGlobalWaMessage(e.detail.waMessageText);
        }
      }
    };
    window.addEventListener('open-inspection-completion-modal', handleOpenCompletionModal);
    return () => window.removeEventListener('open-inspection-completion-modal', handleOpenCompletionModal);
  }, []);

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
  const activeTab = (location.pathname === '/' || location.pathname === '/home') ? 'home' : location.pathname.substring(1);
  const isAutoHide = activeTab !== 'home';
  const [isSidebarPeeked, setIsSidebarPeeked] = useState(false);
  const isBulletin = location.pathname.startsWith('/bulletin');
  const [bulletinFocusMode, setBulletinFocusMode] = useState(true);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  // Auto-collapse peeked sidebar whenever route changes
  useEffect(() => {
    setIsSidebarPeeked(false);
    setHoveredNav(null);
  }, [location.pathname]);

  // Dynamic background & contrast styling matching currently displayed module
  const activeModuleStyle = useMemo(() => {
    if (location.pathname.startsWith('/admin-dashboard') || location.pathname.startsWith('/sap-dashboard')) {
      return {
        bg: '#0f172a',
        activeIconColor: '#38bdf8',
        activeTextColor: '#ffffff',
        isDark: true
      };
    }
    return {
      bg: '#FFFFFF',
      activeIconColor: '#168a96',
      activeTextColor: '#106771',
      isDark: false
    };
  }, [location.pathname]);

  // Auto-minimize header and sidebar whenever user enters bulletin
  useEffect(() => {
    if (location.pathname.startsWith('/bulletin')) {
      setBulletinFocusMode(true);
      window.dispatchEvent(new CustomEvent('bulletin-focus-changed', { detail: { focus: true } }));
    }
  }, [location.pathname]);

  // Support toggling focus mode from bulletin topbar or floating pill
  useEffect(() => {
    const handleToggle = () => {
      setBulletinFocusMode((prev) => {
        const next = !prev;
        window.dispatchEvent(new CustomEvent('bulletin-focus-changed', { detail: { focus: next } }));
        return next;
      });
    };
    window.addEventListener('toggle-bulletin-focus', handleToggle);
    return () => window.removeEventListener('toggle-bulletin-focus', handleToggle);
  }, []);

  const [syncTick, setSyncTick] = useState(0);

  useEffect(() => {
    const handleProfileUpdate = () => setSyncTick(t => t + 1);
    window.addEventListener('profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('profile_updated', handleProfileUpdate);
  }, []);

  useEffect(() => {
    const handleNavBulletin = (e: any) => {
      const link = e.detail?.link || '/bulletin';
      navigate(link);
    };
    const handleNavAgenda = (e: any) => {
      const link = e.detail?.link || '/agenda';
      navigate(link);
    };
    const handleNavTab = (e: any) => {
      if (e.detail?.tab) handleNav(e.detail.tab);
    };
    window.addEventListener('navigate-bulletin', handleNavBulletin);
    window.addEventListener('navigate-agenda', handleNavAgenda);
    window.addEventListener('navigate-tab', handleNavTab);
    return () => {
      window.removeEventListener('navigate-bulletin', handleNavBulletin);
      window.removeEventListener('navigate-agenda', handleNavAgenda);
      window.removeEventListener('navigate-tab', handleNavTab);
    };
  }, [navigate]);

  const userProfile = React.useMemo(() => {
    try {
      const p = localStorage.getItem("p2h_inspector_profile");
      return p ? JSON.parse(p) : null;
    } catch(e) {
      return null;
    }
  }, [inspectorNik, syncTick]);

  const headerAvatar = React.useMemo(() => {
    let raw: string | null = null;
    if (inspectorNik) {
      const savedAvatar = localStorage.getItem(`p2h_inspector_avatar_${inspectorNik}`);
      if (savedAvatar) {
        // Jangan gunakan foto drive dari excel master sebagai foto profil akun
        if (savedAvatar.includes('drive.google.com') || savedAvatar.includes('lh3.googleusercontent.com') || savedAvatar.includes('/api/employees/photo/')) {
          localStorage.removeItem(`p2h_inspector_avatar_${inspectorNik}`);
        } else {
          raw = savedAvatar;
        }
      }
    }
    if (!raw && userProfile?.avatar) {
      if (!userProfile.avatar.includes('drive.google.com') && !userProfile.avatar.includes('lh3.googleusercontent.com') && !userProfile.avatar.includes('/api/employees/photo/')) {
        raw = userProfile.avatar;
      }
    }
    return raw ? formatAvatarUrl(raw) : null;
  }, [inspectorNik, userProfile, syncTick]);

  // Real-time Global Portal Presence Registration
  useEffect(() => {
    if (!inspectorNik) return;

    const user = {
      nik: inspectorNik,
      name: inspectorName || inspectorNik,
      department: userProfile?.section || userProfile?.department || 'General',
      section: userProfile?.section || 'General',
      avatar: headerAvatar || userProfile?.avatar || undefined,
      equippedTitle: userProfile?.equippedTitle,
      equippedFrame: userProfile?.equippedFrame
    };

    registerPresence(user);

    const pingInterval = setInterval(() => {
      pingPresence();
    }, 25000);

    return () => {
      clearInterval(pingInterval);
      unregisterPresence();
    };
  }, [inspectorNik, inspectorName, userProfile, headerAvatar]);

  const [developerList, setDeveloperList] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/developers')
      .then(res => res.json())
      .then(json => {
        const list = Array.isArray(json) ? json : (json?.data || []);
        setDeveloperList(list);
      })
      .catch(() => {});

    // Validate active login session against backend
    if (inspectorNik) {
      fetch('/api/auth/me')
        .then(res => {
          if (res.status === 401) {
            console.warn('[Auth] Session token is missing or expired. Prompting re-login...');
            localStorage.removeItem('p2h_token');
            localStorage.removeItem('token');
            localStorage.removeItem('p2h_inspector_nik');
            localStorage.removeItem('p2h_inspector_name');
            localStorage.removeItem('p2h_inspector_jabatan');
            localStorage.removeItem('p2h_inspector_profile');
            setInspectorNik(null);
            setInspectorName(null);
            toast.error('Sesi login telah berakhir. Silakan login kembali untuk mengakses database.', { duration: 6000 });
          }
        })
        .catch(() => {});
    }
  }, [inspectorNik]);

  const isMeetingRoom = React.useMemo(() => {
    const nik = (inspectorNik || '').toUpperCase();
    return nik === 'MEETINGROOM' || nik === 'MEETING';
  }, [inspectorNik]);

  const [meetingRoomDevUnlocked, setMeetingRoomDevUnlocked] = useState(false);
  const [showMeetingRoomDevModal, setShowMeetingRoomDevModal] = useState(false);

  const isDeveloper = React.useMemo(() => {
    if (isMeetingRoom) return meetingRoomDevUnlocked;
    if (
      inspectorNik === '02D25000055' ||
      inspectorNik === '02D24000043' ||
      inspectorNik === '04D21001047' || // Sukarman A. Akil, ST
      inspectorNik === '04D24000042' || // Junjunan Muhammad Syukur
      inspectorNik === 'M0403240177' || // Aldy Aldersun Puluh
      inspectorNik === 'preplabadmin'
    ) return true;
    return developerList.some(d => d.nik === inspectorNik);
  }, [inspectorNik, developerList, isMeetingRoom, meetingRoomDevUnlocked]);

  const isCrewRole = React.useMemo(() => {
    if (isMeetingRoom) return false;
    if (isDeveloper) return false;
    const jab = (userProfile?.jabatan || localStorage.getItem('p2h_inspector_jabatan') || '').toLowerCase();
    const role = (userProfile?.role || '').toLowerCase();
    const isCrew = jab.includes('crew') || jab.includes('operator') || jab.includes('helper') || 
                   jab.includes('teknisi') || role.includes('crew');
    const isHigher = jab.includes('spv') || jab.includes('supervisor') || jab.includes('foreman') || 
                     jab.includes('officer') || jab.includes('analyst') || jab.includes('superintendent') || 
                     jab.includes('manager') || jab.includes('admin') || jab.includes('lead') ||
                     role.includes('admin') || role.includes('supervisor');
    return isCrew && !isHigher;
  }, [userProfile, isMeetingRoom, isDeveloper]);

  const isMaintenanceCrew = React.useMemo(() => {
    if (!isCrewRole) return false;
    const sec = (userProfile?.section || '').toLowerCase();
    const jab = (userProfile?.jabatan || localStorage.getItem('p2h_inspector_jabatan') || '').toLowerCase();
    const role = (userProfile?.role || '').toLowerCase();
    return sec.includes('maint') || sec.includes('pemeliharaan') || 
           jab.includes('maint') || jab.includes('mekanik') || jab.includes('listrik') || 
           jab.includes('electric') || jab.includes('welder') || jab.includes('teknisi') ||
           role.includes('maint') || role.includes('teknisi');
  }, [isCrewRole, userProfile]);

  const userDept = React.useMemo(() => {
    if (isMeetingRoom) return "ALL";
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
  }, [userProfile, isMeetingRoom]);

  const isAdminOrDeveloper = React.useMemo(() => {
    if (isMeetingRoom) return true;
    if (isDeveloper) return true;
    const jab = (userProfile?.jabatan || '').toLowerCase();
    const sec = (userProfile?.section || '').toLowerCase();
    return (
      jab.includes('admin') ||
      jab.includes('manager') ||
      jab.includes('superintendent') ||
      jab.includes('qa') ||
      sec.includes('admin') ||
      sec.includes('administrasi') ||
      sec.includes('qa') ||
      sec.includes('quality assurance')
    );
  }, [isDeveloper, userProfile, isMeetingRoom]);

  // SPT (Superintendent) & Manager Homepage Routing
  const isSptOrManager = React.useMemo(() => {
    if (isMeetingRoom) return false;
    const jab = (userProfile?.jabatan || '').toLowerCase();
    return (
      jab.includes('superintendent') ||
      jab.includes('spt') ||
      jab.includes('manager')
    );
  }, [userProfile, isMeetingRoom]);

  const [showProfileScreen, setShowProfileScreen] = useState(false);
  const [showModulesDrawer, setShowModulesDrawer] = useState(false);
  const [showBulletinMenu, setShowBulletinMenu] = useState(false);
  const [showHazardReportModal, setShowHazardReportModal] = useState(false);
  const [showSapDrawer, setShowSapDrawer] = useState(false);
  const [showChatDrawer, setShowChatDrawer] = useState(false);
  const [loading, setLoading] = useState(true);

  // Listen for global open sap drawer and chat drawer requests
  useEffect(() => {
    const handleOpenSap = () => {
      if (isAdminOrDeveloper) {
        setShowSapDrawer(true);
      } else {
        toast.error('Akses SAP Management hanya untuk Tim Administrasi dan Developer.');
      }
    };
    const handleOpenChat = () => setShowChatDrawer(true);
    window.addEventListener('open-sap-drawer', handleOpenSap);
    window.addEventListener('open-chat-drawer', handleOpenChat);
    return () => {
      window.removeEventListener('open-sap-drawer', handleOpenSap);
      window.removeEventListener('open-chat-drawer', handleOpenChat);
    };
  }, [isAdminOrDeveloper]);

  // Listen for global open hazard report modal requests
  useEffect(() => {
    const handleOpenHazard = () => {
      if (isAdminOrDeveloper) {
        setShowSapDrawer(true);
      } else {
        toast.error('Akses SAP Management hanya untuk Tim Administrasi dan Developer.');
      }
    };
    window.addEventListener('open-hazard-report-modal', handleOpenHazard);
    return () => window.removeEventListener('open-hazard-report-modal', handleOpenHazard);
  }, [isAdminOrDeveloper]);

  // Listen for global open modules drawer requests and Alt+M shortcut (blocked for Crew)
  useEffect(() => {
    const handleOpenDrawer = () => {
      if (isCrewRole) return;
      setShowModulesDrawer(true);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        if (isCrewRole) return;
        setShowModulesDrawer(prev => !prev);
      }
    };
    window.addEventListener('open-modules-drawer', handleOpenDrawer);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('open-modules-drawer', handleOpenDrawer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCrewRole]);

  // Listen for open-profile-screen request
  useEffect(() => {
    const handleOpenProfile = () => setShowProfileScreen(true);
    window.addEventListener('open-profile-screen', handleOpenProfile);
    return () => window.removeEventListener('open-profile-screen', handleOpenProfile);
  }, []);

  // Crew Route Protection: ensure crew cannot access unauthorized pages via direct URL or link
  useEffect(() => {
    if (!isCrewRole) return;
    const path = location.pathname.replace(/^\//, '');
    const allowedCrewPaths = ['', 'home', 'quiz', 'clinic', 'kunjungan-klinik', 'settings'];
    if (isMaintenanceCrew) {
      allowedCrewPaths.push('wo-list');
    }
    if (path && !allowedCrewPaths.includes(path)) {
      navigate('/', { replace: true });
    }
  }, [isCrewRole, isMaintenanceCrew, location.pathname, navigate]);

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
      morning: { '--bg-main': '#F4F7F6', '--primary': '#2A9D8F', '--primary-hover': '#21867A', '--accent': '#E9930D', '--card-bg': '#FFFFFF', '--text-main': '#000000', '--text-muted': '#000000', '--border-main': '#CBD5E1', '--input-bg': '#FFFFFF', '--bubble-color': '#E9930D', '--header-bg': '#FFFFFF', '--header-text': '#000000', '--footer-selected': '#2A9D8F', '--username-color': '#000000' },
      afternoon: { '--bg-main': '#F4F7F6', '--primary': '#2A9D8F', '--primary-hover': '#21867A', '--accent': '#E9930D', '--card-bg': '#FFFFFF', '--text-main': '#000000', '--text-muted': '#000000', '--border-main': '#CBD5E1', '--input-bg': '#FFFFFF', '--bubble-color': '#E9930D', '--header-bg': '#FFFFFF', '--header-text': '#000000', '--footer-selected': '#2A9D8F', '--username-color': '#000000' },
      evening: { '--bg-main': '#0F172A', '--primary': '#2A9D8F', '--primary-hover': '#21867A', '--accent': '#E9930D', '--card-bg': '#1E293B', '--text-main': '#F8FAFC', '--text-muted': '#94A3B8', '--border-main': '#334155', '--input-bg': '#0F172A', '--bubble-color': '#E9930D', '--header-bg': '#1E293B', '--header-text': '#F8FAFC', '--footer-selected': '#2A9D8F', '--username-color': '#2A9D8F' }
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
            // Lindungi foto sebelumnya: jangan pernah hapus cache avatar lokal jika backend belum memiliki foto!
            // Justru sinkronkan kembali cache lokal ke backend agar foto tersimpan permanen
            const localCached = localStorage.getItem(`p2h_inspector_avatar_${inspectorNik}`);
            if (localCached && localCached.trim()) {
              if (localCached.includes('drive.google.com') || localCached.includes('lh3.googleusercontent.com') || localCached.includes('/api/employees/photo/')) {
                localStorage.removeItem(`p2h_inspector_avatar_${inspectorNik}`);
              } else {
                fetch('/api/employees/avatar', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ nik: inspectorNik, avatar: localCached.trim() })
                }).catch(() => {});
              }
            }
          }
          window.dispatchEvent(new Event('profile_updated'));
        }
      } catch (err) {
        console.error("Gagal sinkronisasi profil", err);
      }
    };
    syncProfile();
  }, [inspectorNik]);


  
  const handleNav = (tab: string) => {
    const cleanTab = tab.replace(/^\//, '');
    if (cleanTab === 'admin-dashboard' && isMeetingRoom && !meetingRoomDevUnlocked) {
      setShowMeetingRoomDevModal(true);
      return;
    }
    if (cleanTab === 'profile') {
      setShowProfileScreen(true);
      return;
    }

    // Role guard for Crew: restrict navigation to allowed modules only
    if (isCrewRole) {
      const allowedCrewTabs = ['home', '', 'quiz', 'clinic', 'kunjungan-klinik', 'settings'];
      if (isMaintenanceCrew) {
        allowedCrewTabs.push('wo-list');
      }
      if (!allowedCrewTabs.includes(cleanTab)) {
        toast.error('Akses modul ini tidak tersedia untuk akun Crew.');
        navigate('/');
        return;
      }
    }

    if (tab === 'home' || tab === '' || tab === '/') {
      navigate('/home');
    }
    else navigate('/' + cleanTab);
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
  const [showPassword, setShowPassword] = useState(false);
  const [requireSetup, setRequireSetup] = useState(false);
  const [setupPassword1, setSetupPassword1] = useState('');
  const [showSetupPassword1, setShowSetupPassword1] = useState(false);
  const [setupPassword2, setSetupPassword2] = useState('');
  const [showSetupPassword2, setShowSetupPassword2] = useState(false);
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
         const res = await fetch('/api/auth/setup', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ 
                 identifier: inputNik,
                 nik: inputNik, 
                 password: setupPassword1, 
                 email: setupEmail
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
                  if (data.token) {
                      localStorage.setItem('p2h_token', data.token);
                      localStorage.setItem('token', data.token);
                  }
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
                  setShowPassword(false);

                  const jab = (data.employee?.jabatan || '').toLowerCase();
                  const isSuperOrMgr = jab.includes('superintendent') || jab.includes('spt') || jab.includes('manager');
                  if (isSuperOrMgr) {
                      const targetUniverse = data.employee?.pt === 'GTS' ? 'GTS' : 'TBP';
                      navigate(`/bulletin/${targetUniverse}`);
                  }
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



  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogoutKaryawan = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogoutKaryawan = () => {
    setShowLogoutConfirm(false);
    setShowProfileScreen(false);
    setInspectorName(null);
    setInspectorNik(null);
    setNikInput('');
    localStorage.removeItem('p2h_token');
    localStorage.removeItem('token');
    localStorage.removeItem('p2h_inspector_name');
    localStorage.removeItem('p2h_inspector_nik');
    localStorage.removeItem('p2h_inspector_username');
    localStorage.removeItem('p2h_inspector_jabatan');
    localStorage.removeItem('p2h_inspector_profile');
    sessionStorage.removeItem('username_prompted');
    setMeetingRoomDevUnlocked(false);
    toast.success('Sesi berhasil diakhiri.');
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
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-teal-400" />
                      <span>Password Akun</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] text-slate-400 hover:text-teal-400 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {showPassword ? (
                        <>
                          <EyeOff className="w-3 h-3 text-teal-400" />
                          <span className="text-teal-400 font-medium">Sembunyikan</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" />
                          <span>Lihat Password</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={passwordInput}
                      onChange={e => setPasswordInput(e.target.value)}
                      required
                      autoFocus
                      className="w-full px-4 py-3 pr-11 bg-slate-950/70 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 transition-all shadow-inner font-sans"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-400 p-1 cursor-pointer transition-colors"
                      title={showPassword ? "Sembunyikan password" : "Lihat password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4 text-teal-400" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
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
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-300">Password Baru</label>
                    <button
                      type="button"
                      onClick={() => setShowSetupPassword1(!showSetupPassword1)}
                      className="text-[10px] text-slate-400 hover:text-teal-400 flex items-center gap-1 cursor-pointer"
                    >
                      {showSetupPassword1 ? <EyeOff className="w-3 h-3 text-teal-400" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      type={showSetupPassword1 ? "text" : "password"}
                      placeholder="Minimal 6 karakter"
                      value={setupPassword1}
                      onChange={e => setSetupPassword1(e.target.value)}
                      required
                      className="w-full px-3 py-2 pr-9 bg-slate-950/70 border border-slate-700/80 rounded-lg text-white text-xs focus:outline-none focus:border-teal-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSetupPassword1(!showSetupPassword1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-400 p-0.5 cursor-pointer"
                    >
                      {showSetupPassword1 ? <EyeOff className="w-3.5 h-3.5 text-teal-400" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-300">Konfirmasi Password Baru</label>
                    <button
                      type="button"
                      onClick={() => setShowSetupPassword2(!showSetupPassword2)}
                      className="text-[10px] text-slate-400 hover:text-teal-400 flex items-center gap-1 cursor-pointer"
                    >
                      {showSetupPassword2 ? <EyeOff className="w-3 h-3 text-teal-400" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      type={showSetupPassword2 ? "text" : "password"}
                      placeholder="Ulangi password baru"
                      value={setupPassword2}
                      onChange={e => setSetupPassword2(e.target.value)}
                      required
                      className="w-full px-3 py-2 pr-9 bg-slate-950/70 border border-slate-700/80 rounded-lg text-white text-xs focus:outline-none focus:border-teal-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSetupPassword2(!showSetupPassword2)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-400 p-0.5 cursor-pointer"
                    >
                      {showSetupPassword2 ? <EyeOff className="w-3.5 h-3.5 text-teal-400" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
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
    <div className="flex w-full min-h-[100dvh] h-[100dvh] overflow-hidden transition-colors duration-300" style={{ backgroundColor: activeModuleStyle.bg }}>
      {/* 0. Left Edge Hover Trigger: Hover near left edge to reveal sidebar on subpages */}
      {isAutoHide && !isCrewRole && (
        <div 
          className="fixed top-0 left-0 w-3.5 h-[100dvh] z-40 cursor-pointer pointer-events-auto select-none"
          onMouseEnter={() => setIsSidebarPeeked(true)}
          title="Arahkan kursor ke sini untuk membuka menu sidebar"
        />
      )}

      {/* 1. Left Sidebar: Full-height past the header, unified navigation rail */}
      {!isCrewRole && (
        <aside 
          onMouseEnter={() => {
            if (isAutoHide) setIsSidebarPeeked(true);
          }}
          onMouseLeave={() => {
            setHoveredNav(null);
            if (isAutoHide) setIsSidebarPeeked(false);
          }}
          className={`flex-col items-center w-20 lg:w-22 shrink-0 select-none py-3 justify-between overflow-y-auto overflow-x-hidden ${
            isBulletin && bulletinFocusMode && !isSidebarPeeked ? 'hidden' : 'flex'
          } ${
            isAutoHide
              ? `fixed top-0 left-0 h-[100dvh] z-50 transition-transform duration-300 ease-out ${
                  isSidebarPeeked ? 'translate-x-0 shadow-2xl pointer-events-auto' : '-translate-x-full pointer-events-none'
                }`
              : 'relative h-[100dvh] z-50 transition-all duration-300'
          }`}
          style={{
            background: 'linear-gradient(180deg, #1da8b5 0%, #168a96 45%, #106771 100%)',
            boxShadow: isAutoHide && isSidebarPeeked
              ? 'inset -1px 0 0 0 rgba(255,255,255,0.22), 8px 0 32px rgba(0,0,0,0.32)'
              : 'inset -1px 0 0 0 rgba(255,255,255,0.18), 4px 0 20px rgba(0,0,0,0.08)'
          }}
        >
          {/* Top Branding Section with PrepLab & HARITA NICKEL */}
          <div className="flex flex-col items-center justify-center w-full px-1 pt-1 pb-1.5 select-none">
            <div 
              className="w-9 h-9 lg:w-10 lg:h-10 rounded-2xl bg-white/15 p-1.5 flex items-center justify-center border border-white/25 shadow-md mb-1.5 backdrop-blur-xs group cursor-pointer active:scale-95 transition-transform" 
              onClick={() => {
                if (isAutoHide) setIsSidebarPeeked(false);
                handleLogoClick();
              }} 
              title="Beranda PrepLab"
            >
              <img 
                src="/preplab-logo.png" 
                alt="PrepLab" 
                className="w-full h-full object-contain filter drop-shadow-sm" 
                onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png'; }} 
              />
            </div>
            <div className="flex items-center gap-0.5 font-black text-xs lg:text-sm tracking-tight font-display text-center leading-tight">
              <span className="text-white font-black drop-shadow-xs">Prep</span>
              <span className="text-teal-200 font-black drop-shadow-xs">Lab</span>
            </div>
            <span className="text-[7px] lg:text-[7.5px] font-black tracking-widest uppercase text-teal-100/90 leading-none mt-1 text-center font-mono">
              HARITA NICKEL
            </span>
            <div className="w-6 h-0.5 bg-gradient-to-r from-teal-300 to-cyan-300 rounded-full mt-1.5 opacity-75" />
          </div>

          {/* Navigation Items List with Smooth Follower Notch (Merged Left & Right Rails) */}
          <div className="flex flex-col items-center w-full flex-1 gap-1 pt-1 overflow-y-auto no-scrollbar">
            {[
              {
                id: 'modules',
                label: 'Menu',
                icon: LayoutGrid,
                onClick: () => setShowModulesDrawer(true),
                title: 'Buka Semua Menu & Modul Portal',
              },
              {
                id: 'home',
                label: 'Home',
                icon: Home,
                onClick: () => handleNav('home'),
                title: 'Beranda / Home',
              },
              {
                id: 'bulletin',
                label: 'Labnote',
                icon: FileText,
                onClick: () => {
                  const activeUniv = localStorage.getItem('bulletin_active_universe');
                  const targetUniverse = isDeveloper
                    ? (activeUniv === 'GTS' ? 'GTS' : 'TBP')
                    : (userProfile?.pt === 'GTS' ? 'GTS' : 'TBP');
                  handleNav(`bulletin/${targetUniverse}`);
                },
                title: 'Labnote & Pengumuman',
              },
              {
                id: 'chat',
                label: 'Chat',
                icon: MessageSquare,
                onClick: () => setShowChatDrawer(true),
                title: 'Buka Portal Chat (Global & Section)',
              },
              ...(isAdminOrDeveloper ? [{
                id: 'sap',
                label: 'SAP',
                icon: ShieldAlert,
                onClick: () => setShowSapDrawer(true),
                title: 'SAP Management (Safety & Rekap Laporan)',
              }] : []),
              {
                id: 'leaderboard',
                label: 'Rank',
                icon: Trophy,
                onClick: () => handleNav('leaderboard'),
                title: 'PrepLab Hall of Fame & Leaderboard',
              },
              {
                id: 'cloud',
                label: 'Cloud',
                icon: Cloud,
                onClick: () => handleNav('preplab-cloud'),
                title: 'PrepLab Cloud Storage',
              },
              {
                id: 'settings',
                label: 'Settings',
                icon: Settings,
                onClick: () => handleNav('settings'),
                title: 'Pengaturan Akun & Tema',
              },
              ...(isDeveloper || isMeetingRoom ? [{
                id: 'dev',
                label: 'Dev',
                icon: Code2,
                onClick: () => handleNav('admin-dashboard'),
                title: 'Developer Dashboard',
              }] : [])
            ].map((item) => {
              const currentActiveKey = activeTab.startsWith('bulletin') 
                ? 'bulletin' 
                : (activeTab === 'home' || !activeTab 
                  ? 'home' 
                  : (activeTab === 'chat' || activeTab === 'group-reports'
                    ? 'chat'
                    : (activeTab === 'leaderboard'
                      ? 'leaderboard'
                      : (activeTab === 'preplab-cloud' 
                        ? 'cloud' 
                        : (activeTab === 'settings' 
                          ? 'settings' 
                          : (activeTab === 'admin-dashboard' || activeTab === 'sap-dashboard' ? 'dev' : ''))))));
              
              const isHighlighted = hoveredNav ? hoveredNav === item.id : currentActiveKey === item.id;
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  className="relative w-full flex items-center justify-center py-0.5"
                  onMouseEnter={() => setHoveredNav(item.id)}
                >
                  {/* Animated Sliding Notch with Inverted Corner Fillets */}
                  {isHighlighted && (
                    <motion.div
                      layoutId="curved-sidebar-notch"
                      className="absolute inset-y-0 right-0 left-2.5 rounded-l-2xl z-0 pointer-events-none"
                      style={{
                        backgroundColor: activeModuleStyle.bg,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 34,
                        mass: 0.8
                      }}
                    >
                      {/* Top Inverted Concave Fillet (20x20 smooth curve) */}
                      <svg
                        className="absolute -top-5 right-0 w-5 h-5 pointer-events-none z-10"
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M20,0 C20,11.046 11.046,20 0,20 L20,20 Z"
                          style={{ fill: activeModuleStyle.bg }}
                        />
                      </svg>

                      {/* Bottom Inverted Concave Fillet (20x20 smooth curve) */}
                      <svg
                        className="absolute -bottom-5 right-0 w-5 h-5 pointer-events-none z-10"
                        viewBox="0 0 20 20"
                        fill="none"
                      >
                        <path
                          d="M0,0 C11.046,0 20,8.954 20,20 L20,0 Z"
                          style={{ fill: activeModuleStyle.bg }}
                        />
                      </svg>
                    </motion.div>
                  )}

                  {/* Interactive Button */}
                  <button
                    onClick={() => {
                      if (isAutoHide) setIsSidebarPeeked(false);
                      item.onClick();
                    }}
                    className="relative z-10 w-full py-1.5 flex flex-col items-center justify-center gap-0.5 transition-all duration-200 cursor-pointer group"
                    title={item.title}
                  >
                    <div 
                      className={`transition-all duration-200 ${
                        isHighlighted 
                          ? 'scale-110 drop-shadow-xs' 
                          : 'text-white/70 group-hover:text-white group-hover:scale-105'
                      }`}
                      style={isHighlighted ? { color: activeModuleStyle.activeIconColor } : undefined}
                    >
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <span 
                      className={`text-[9.5px] leading-none transition-all duration-200 ${
                        isHighlighted 
                          ? 'font-bold' 
                          : 'text-white/70 group-hover:text-white font-medium'
                      }`}
                      style={isHighlighted ? { color: activeModuleStyle.activeTextColor } : undefined}
                    >
                      {item.label}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Bottom Subtle Indicator */}
          <div className="w-full px-2 py-1.5 flex flex-col items-center justify-center border-t border-white/10">
            <div className="flex items-center gap-1.5 text-[9px] text-white/50 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden lg:inline font-bold">ONLINE</span>
            </div>
          </div>
        </aside>
      )}

      {/* 2. Main Right Column: Top Header + Scrollable Content Area */}
      <div 
        className="flex-1 flex flex-col h-[100dvh] relative transition-all duration-300 overflow-x-hidden overflow-y-auto"
        style={{ backgroundColor: activeModuleStyle.bg, color: 'var(--text-main, #000000)' }}
      >
        {appEnv === 'staging' && (
          <div className="w-full bg-orange-500 text-white text-xs font-bold py-1 px-4 text-center z-[100] relative tracking-widest uppercase">
            STAGING ENVIRONMENT - DATA TEST
          </div>
        )}
        <div className="flex flex-col pb-20 md:pb-6 relative min-h-[100dvh]">
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

          {/* Daily Splash Screen (Cross-device synced 1x per day via Server API) */}
          <DailySplashScreen
            userName={inspectorName || undefined}
            userNik={inspectorNik || undefined}
          />
          
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-slate-200/50 to-transparent pointer-events-none"></div>
      
      {/* Sleek Floating Focus Mode Pill when Header & Sidebar are Minimized */}
      {isBulletin && bulletinFocusMode && (
        <div className="fixed bottom-5 left-4 sm:bottom-6 sm:left-6 sm:top-auto sm:right-auto z-50 flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full bg-slate-900/85 dark:bg-black/90 backdrop-blur-md text-white border border-teal-500/40 shadow-2xl text-xs select-none transition-all hover:scale-[1.02]">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          <span className="font-semibold text-slate-200 hidden sm:inline">Focus Mode • Diskusi Kerja</span>
          <div className="h-3 w-px bg-white/20 hidden sm:block" />
          <button
            onClick={() => {
              setBulletinFocusMode(false);
              window.dispatchEvent(new CustomEvent('bulletin-focus-changed', { detail: { focus: false } }));
            }}
            className="text-teal-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 font-medium px-1.5 py-0.5 rounded hover:bg-white/10"
            title="Tampilkan Header & Menu Portal"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="text-[11px]">Buka Menu</span>
          </button>
          <div className="h-3 w-px bg-white/20" />
          <button
            onClick={() => handleNav('home')}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/10"
            title="Kembali ke Beranda Portal"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="text-[11px]">Beranda</span>
          </button>
        </div>
      )}

      {/* Header */}
      <header 
        className={`px-4 md:px-6 lg:px-8 py-3 sticky top-0 z-40 backdrop-blur-md border-b w-full flex justify-center transition-all duration-300 ${
          isBulletin && bulletinFocusMode ? 'hidden' : ''
        }`}
        style={{
          backgroundColor: 'var(--header-bg, var(--card-bg, #FFFFFF))',
          borderColor: 'var(--border-main, #E2E8F0)'
        }}
      >
        <div className="flex justify-between items-center w-full">
        <div className="flex items-center gap-3">
          {activeTab !== 'home' && (
            <button 
              onClick={handleBack} 
              className="w-8 h-8 rounded-full border flex items-center justify-center shadow-sm active:scale-95 transition-transform"
              style={{
                backgroundColor: 'var(--input-bg, #ffffff)',
                borderColor: 'var(--border-main, #e2e8f0)',
                color: 'var(--text-main, #334155)'
              }}
              title="Kembali"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Mobile-only logo icon (hidden on desktop because sidebar has full branding) */}
          <div 
            className="flex md:hidden items-center gap-2 cursor-pointer select-none"
            onClick={handleLogoClick}
            title="Kembali ke Beranda"
          >
            <div className="w-8 h-8 rounded-lg bg-teal-600/10 p-1 flex items-center justify-center border border-teal-500/20 shadow-xs overflow-hidden">
               <img src="/preplab-logo.png" alt="Prep & Lab Logo" className="w-full h-full object-contain" onError={(e) => {
                 (e.target as HTMLImageElement).src = '/logo.png'; 
               }} />
            </div>
          </div>
        </div>

        {/* Center Header: Module Search Bar */}
        <HeaderModuleSearchBar
          onNav={handleNav}
          onOpenKta={() => {
            window.dispatchEvent(new CustomEvent('open-simplified-inspection', { detail: { tab: 'kta_tta' } }));
          }}
          onOpenP5m={() => {
            window.dispatchEvent(new CustomEvent('open-simplified-p5m-modal'));
          }}
        />

        <div className="flex items-center gap-3">
          {isBulletin && !bulletinFocusMode && (
            <button
              onClick={() => {
                setBulletinFocusMode(true);
                window.dispatchEvent(new CustomEvent('bulletin-focus-changed', { detail: { focus: true } }));
              }}
              className="px-2.5 py-1 rounded-full text-xs font-bold border border-teal-500/40 bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-500/20 transition-all flex items-center gap-1 cursor-pointer"
              title="Masuk ke Focus Mode Diskusi Kerja"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Focus Mode</span>
            </button>
          )}
          <NotificationBell 
            userNik={inspectorNik || undefined} 
            userName={inspectorName || undefined}
            onOpenP5mModal={() => {
              window.dispatchEvent(new CustomEvent('open-p5m-modal'));
            }}
          />
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
              <img src={headerAvatar} alt={inspectorName || 'Profile'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="font-bold font-display text-xs" style={{ color: 'var(--primary, #0f766e)' }}>{inspectorName ? inspectorName.charAt(0).toUpperCase() : '?'}</span>
            )}
          </button></div></div></header>

      {/* Main Content Area */}
      <main className={`@container flex-1 flex flex-col w-full bg-transparent min-w-0 transition-all duration-300 ${
        isBulletin && bulletinFocusMode ? 'h-[100dvh] overflow-hidden p-0' : 'h-full'
      }`}>
        
      <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
              <AnimatePresence mode="wait">
<Routes location={location} key={location.pathname}>
  <Route 
    path="/" 
    element={
      isSptOrManager ? (
        <Navigate to={`/bulletin/${userProfile?.pt === 'GTS' ? 'GTS' : 'TBP'}`} replace />
      ) : (
        <HomeScreen inspectorName={inspectorName!} inspectorNik={inspectorNik!} onNav={handleNav} userPt={userProfile?.pt} />
      )
    } 
  />
  <Route 
    path="/home" 
    element={
      <HomeScreen inspectorName={inspectorName!} inspectorNik={inspectorNik!} onNav={handleNav} userPt={userProfile?.pt} />
    } 
  />
  <Route path="/modules" element={<ModulesScreen onNav={handleNav} inspectorNik={inspectorNik!} inspectorName={inspectorName!} userPt={userProfile?.pt} />} />
  <Route path="/chat" element={<GroupReportScreen inspectorName={inspectorName!} inspectorNik={inspectorNik!} inspectorRole={userProfile?.jabatan} inspectorSection={userProfile?.section} />} />
  <Route path="/group-reports" element={<GroupReportScreen inspectorName={inspectorName!} inspectorNik={inspectorNik!} inspectorRole={userProfile?.jabatan} inspectorSection={userProfile?.section} />} />
  <Route path="/inspect" element={<InspectionScreen inspectorName={inspectorName!} inspectorNik={inspectorNik!} equipmentCategories={equipmentCategories || []} reloadData={fetchMasterData} loading={loadingEquipments} />} />
  <Route path="/downtime" element={<DowntimePage inspectorNik={inspectorNik!} equipmentCategories={equipmentCategories || []} />} />
  <Route path="/create-wo" element={<CreateWOScreen inspectorName={inspectorName!} inspectorNik={inspectorNik!} equipmentCategories={equipmentCategories || []} />} />
  <Route path="/create-internal-ticket" element={<CreateInternalTicketScreen inspectorName={inspectorName!} inspectorNik={inspectorNik!} onBack={() => handleNav('home')} />} />
  <Route path="/wo-list" element={<WOListScreen inspectorName={inspectorName!} inspectorNik={inspectorNik!} />} />
  <Route path="/ticket" element={<TicketScreen inspectorName={inspectorName!} inspectorNik={inspectorNik!} />} />
  <Route 
    path="/weekly-inspection" 
    element={
      <WeeklyInspectionScreen 
        inspectorName={inspectorName!} 
        inspectorNik={inspectorNik!} 
        inspectorJabatan={userProfile?.jabatan || ""} 
        onInspectionComplete={(result) => {
          if (typeof result === 'string') {
            setInspectionCompletionData({ isOpen: true, waMessageText: result });
            setGlobalWaMessage(result);
          } else {
            setInspectionCompletionData({ isOpen: true, ...result });
            if (result.waMessageText) setGlobalWaMessage(result.waMessageText);
          }
        }} 
      />
    } 
  />
  <Route path="/pemantauan" element={<PemantauanScreen inspectorName={inspectorName!} inspectorNik={inspectorNik!} />} />
  <Route path="/monitoring" element={<MonitoringDashboard inspectorNik={inspectorNik!} inspectorName={inspectorName!} isDeveloper={isDeveloper} />} />
  <Route path="/quiz-admin" element={<QuizAdminScreen userSection={userProfile?.section || ''} onBack={() => handleNav('home')} />} />
  <Route path="/quiz" element={<QuizScreen inspectorName={inspectorName!} inspectorNik={inspectorNik!} userSection={userProfile?.section || ''} onBack={() => handleNav('home')} />} />
  <Route path="/apd" element={<Navigate to="/apd-input" replace />} />
  <Route path="/apd/*" element={<Navigate to="/apd-input" replace />} />
  <Route path="/apd-input" element={<ApdInputScreen onBack={() => handleNav('home')} onNav={handleNav} inspectorNik={inspectorNik!} inspectorName={inspectorName!} />} />
  <Route path="/apd-settings" element={<ApdSettingsScreen onBack={() => handleNav('home')} onNav={handleNav} />} />
  <Route path="/apd-monitoring" element={<ApdMonitoringScreen onBack={() => handleNav('home')} onNav={handleNav} />} />
  <Route path="/induksi" element={<InduksiScreen />} />
  <Route path="/preplab-cloud" element={<PreplabCloudScreen onBack={() => handleNav('home')} userProfile={userProfile} inspectorNik={inspectorNik!} inspectorName={inspectorName!} />} />
  <Route path="/manual" element={<UserManualScreen onBack={() => handleNav('home')} onNav={handleNav} />} />
  <Route path="/employee-database" element={<EmployeeDatabaseScreen inspectorNik={inspectorNik!} onBack={() => handleNav('home')} />} />
  <Route path="/roster-admin" element={<RosterAdminScreen />} />
  <Route path="/settings" element={<SettingsScreen inspectorName={inspectorName} inspectorNik={inspectorNik} onLogoutKaryawan={handleLogoutKaryawan} onOpenThemeModal={() => setShowGlobalThemeModal(true)} onNav={handleNav} />} />
  <Route 
    path="/admin-dashboard" 
    element={
      isMeetingRoom && !meetingRoomDevUnlocked ? (
        <Navigate to="/" replace />
      ) : (
        <AdminDashboard inspectorNik={inspectorNik!} />
      )
    } 
  />
  <Route path="/sap-dashboard" element={<SapDashboard inspectorNik={inspectorNik!} inspectorName={inspectorName!} />} />
  <Route path="/adm-dashboard" element={<AdmDashboard />} />
  <Route path="/pelanggaran-dashboard" element={<PelanggaranDashboard />} />
  <Route path="/wo-maintenance-dashboard" element={<WOMaintenanceDashboard onBack={() => handleNav('home')} inspectorNik={inspectorNik!} />} />
  <Route path="/wo-dashboard" element={<WOMaintenanceDashboard onBack={() => handleNav('home')} inspectorNik={inspectorNik!} />} />
  <Route path="/bulletin/GPS" element={<Navigate to="/bulletin/TBP" replace />} />
  <Route path="/bulletin/:pt" element={<BulletinBoard inspectorNik={inspectorNik!} inspectorName={inspectorName!} isDeveloper={isDeveloper} userPt={userProfile?.pt || 'TBP'} />} />
  <Route path="/bulletin" element={<Navigate to={`/bulletin/${isDeveloper ? (localStorage.getItem('bulletin_active_universe') === 'GTS' ? 'GTS' : 'TBP') : (userProfile?.pt === 'GTS' ? 'GTS' : 'TBP')}`} replace />} />
  <Route path="/agenda" element={<AgendaDashboard key="agenda" inspectorNik={inspectorNik!} inspectorName={inspectorName!} userDept={userDept || undefined} isDeveloper={isDeveloper} />} />
  <Route path="/p5m" element={<P5MScreen onBack={() => handleNav('home')} userProfile={userProfile} />} />
  <Route path="/feedback-support" element={<FeedbackSupportScreen inspectorNik={inspectorNik!} inspectorName={inspectorName!} onBack={() => handleNav('home')} />} />
  <Route path="/finance" element={<FinanceScreen inspectorNik={inspectorNik!} inspectorName={inspectorName!} />} />
  <Route path="/leaderboard" element={<LeaderboardScreen inspectorNik={inspectorNik!} inspectorName={inspectorName!} userProfile={userProfile} onBack={() => handleNav('home')} />} />
  <Route path="/logbook" element={<LogbookScreen inspectorName={inspectorName!} inspectorNik={inspectorNik!} userPt={userProfile?.pt || 'TBP'} onNav={handleNav} onBack={() => handleNav('home')} />} />
  <Route path="/clinic" element={<ClinicScreen inspectorName={inspectorName!} inspectorNik={inspectorNik!} userPt={userProfile?.pt || 'TBP'} onNav={handleNav} onBack={() => handleNav('home')} />} />
  <Route path="/kunjungan-klinik" element={<Navigate to="/clinic" replace />} />
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
                  Pilih Labnote
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
      {!isCrewRole && !(isBulletin && bulletinFocusMode) && (
        <nav 
          className="fixed bottom-0 w-full md:hidden backdrop-blur-xl border-t z-40 flex items-center justify-around h-[4.5rem] pb-safe transition-colors" 
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
            label="Labnote" 
            active={activeTab.startsWith('bulletin')} 
            onClick={() => { 
              const activeUniv = localStorage.getItem('bulletin_active_universe');
              const targetUniverse = isDeveloper
                ? (activeUniv === 'GTS' ? 'GTS' : 'TBP')
                : (userProfile?.pt === 'GTS' ? 'GTS' : 'TBP');
              handleNav(`bulletin/${targetUniverse}`);
            }} 
          />

          {/* Center All Menu Button on Mobile */}
          <button
            onClick={() => setShowModulesDrawer(true)}
            className="flex flex-col items-center justify-center -mt-3.5 group cursor-pointer active:scale-95 transition-transform"
            title="Buka Semua Menu"
          >
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-md transition-all duration-200 ${
              showModulesDrawer || activeTab === 'modules'
                ? 'bg-gradient-to-tr from-teal-500 to-emerald-600 text-white shadow-teal-500/40 scale-105 ring-2 ring-teal-400/50'
                : 'bg-gradient-to-tr from-teal-600 to-emerald-700 text-white shadow-teal-600/25'
            }`}>
              <LayoutGrid className="w-5 h-5 text-white" />
            </div>
            <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 mt-1 whitespace-nowrap leading-none">
              Semua Menu
            </span>
          </button>

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
          {(isDeveloper || isMeetingRoom) && (
            <NavItem 
              icon={<Code2 className="w-5 h-5" />} 
              label="Dev" 
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
            onLogout={handleLogoutKaryawan}
          />
        )}
      </AnimatePresence>

      {/* All Menu Modules Drawer (Slides in from Left, Wider than Profile View, Hidden for Crew) */}
      {!isCrewRole && (
        <ModulesDrawer
          isOpen={showModulesDrawer}
          onClose={() => setShowModulesDrawer(false)}
          onNav={(tab) => {
            handleNav(tab);
            setShowModulesDrawer(false);
          }}
          inspectorNik={inspectorNik || undefined}
          inspectorName={inspectorName || undefined}
          userPt={userProfile?.pt}
        />
      )}

      {/* SAP Management Drawer (Slides in from RIGHT, wider than profile view) */}
      <AnimatePresence>
        {showSapDrawer && (
          <div className="fixed inset-0 z-[70] overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setShowSapDrawer(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[75]"
            />

            {/* Drawer Panel - Slides in from the RIGHT */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-[80] w-full sm:w-[650px] md:w-[780px] lg:w-[940px] xl:w-[1080px] h-[100dvh] shadow-2xl border-l flex flex-col overflow-hidden transition-colors"
              style={{
                backgroundColor: 'var(--bg-main, #F8FAFC)',
                borderColor: 'var(--border-main, #E2E8F0)',
                color: 'var(--text-main, #1E293B)'
              }}
              onClick={e => e.stopPropagation()}
            >
              <GroupReportScreen
                inspectorName={inspectorName || 'Inspector'}
                inspectorNik={inspectorNik!}
                inspectorRole={userProfile?.jabatan}
                inspectorSection={userProfile?.section}
                onClose={() => setShowSapDrawer(false)}
                isFloating={true}
                isDeveloper={isDeveloper}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Chat Drawer (Slides in from RIGHT, wider than profile view) */}
      <AnimatePresence>
        {showChatDrawer && (
          <div className="fixed inset-0 z-[70] overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setShowChatDrawer(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[75]"
            />

            {/* Drawer Panel - Slides in from the RIGHT */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-[80] w-full sm:w-[540px] md:w-[640px] lg:w-[740px] xl:w-[820px] h-[100dvh] shadow-2xl border-l flex flex-col overflow-hidden transition-colors"
              style={{
                backgroundColor: 'var(--bg-main, #F8FAFC)',
                borderColor: 'var(--border-main, #E2E8F0)',
                color: 'var(--text-main, #1E293B)'
              }}
              onClick={e => e.stopPropagation()}
            >
              <ChatScreen
                inspectorName={inspectorName || 'Inspector'}
                inspectorNik={inspectorNik!}
                userProfile={userProfile}
                isDeveloper={isDeveloper}
                onClose={() => setShowChatDrawer(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* Global Inspection Completion Modal (Download PDF, Buka General Submit Safety, WhatsApp) */}
      <InspectionCompletionModal
        isOpen={Boolean(inspectionCompletionData?.isOpen)}
        onClose={() => {
          setInspectionCompletionData(null);
          setGlobalWaMessage('');
        }}
        data={inspectionCompletionData}
      />



      {/* Global Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        userName={inspectorName}
        userNik={inspectorNik}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogoutKaryawan}
      />

      {/* Push Notification Auto-Prompt for Mobile / PWA */}
      <PushNotificationPrompt 
        userNik={inspectorNik} 
        userName={inspectorName} 
      />

      {/* Universal Gamification Multi-Tier Celebration & Alert Center */}
      <GamificationAlertCenter
        currentNik={inspectorNik}
        currentName={inspectorName}
        userAvatar={userProfile?.avatar}
      />

      {/* Official Main Release Rank Promotion Welcome Ceremony Modal */}
      {inspectorNik && (
        <PromotionWelcomeModal
          currentUserNik={inspectorNik}
          currentUserName={inspectorName}
          userAvatar={userProfile?.avatar}
        />
      )}

      {/* Meeting Room Developer Access Password Modal */}
      <MeetingRoomDevModal
        isOpen={showMeetingRoomDevModal}
        onClose={() => setShowMeetingRoomDevModal(false)}
        onSuccess={() => {
          setMeetingRoomDevUnlocked(true);
          setShowMeetingRoomDevModal(false);
          navigate('/admin-dashboard');
        }}
      />

      {/* Floating Feedback & Suggestions Button */}
      <FloatingFeedbackButton
        inspectorNik={inspectorNik}
        inspectorName={inspectorName}
        userProfile={userProfile}
        isHome={activeTab === 'home'}
        isBulletin={isBulletin}
        isBulletinFocusMode={bulletinFocusMode}
        isCrewRole={isCrewRole}
        currentPath={location.pathname}
        onNavigate={handleNav}
      />

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
