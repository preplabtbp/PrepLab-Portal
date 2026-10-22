import { NotificationBell } from "./components/notification-bell";
import React, { useState, useEffect, Suspense, lazy, useRef, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { registerPresence, pingPresence, unregisterPresence } from './lib/socketClient';

import { Cloud, Activity, Settings, ShieldCheck, CheckCircle2, AlertTriangle, LogOut, FileSpreadsheet, Check, Wrench, ChevronRight, Image as ImageIcon, Camera, X, Code2, ChevronLeft, UploadCloud, Layers, Home, ClipboardList, CheckSquare, PlusCircle, ListTodo, ThermometerSun, LineChart, ClipboardCheck, User, Menu, Calendar, Utensils, FileText, Eye, EyeOff, BriefcaseMedical, Building2, LayoutDashboard, LayoutGrid, MessageCircle, Sparkles, Lock, KeyRound, FlaskConical, Shield, ArrowRight, Receipt, ShieldAlert, Users, BarChart2, MessageSquare, Trophy, Maximize2, Minimize2, Database } from 'lucide-react';
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
import { PwaMigrationModal } from './components/PwaMigrationModal';
import { PromotionWelcomeModal } from './components/PromotionWelcomeModal';
import { GamificationAlertCenter } from './components/GamificationAlertCenter';
import { MeetingRoomDevModal } from './components/MeetingRoomDevModal';
import { FloatingFeedbackButton } from './components/FloatingFeedbackButton';
import { FloatingGeminiButton } from './components/FloatingGeminiButton';
import { initFontSize } from './utils/fontSize';
import { withReadableThemeColors } from './utils/contrast';
import { formatAvatarUrl } from './lib/avatarUtils';
import { setupGlobalAttachmentPaste } from './utils/attachmentPasteHelper';
import { getUserAllowedSections } from './components/notion/logbook-section-utils';

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
const TrainingDatabaseScreen = lazyWithRetry(() => import('./components/training-database-screen').then(m => ({ default: m.TrainingDatabaseScreen })));
const SafetyRekapScreen = lazyWithRetry(() => import('./components/safety-rekap-screen').then(m => ({ default: m.SafetyRekapScreen })));
const InspectionScheduleScreen = lazyWithRetry(() => import('./components/inspection-schedule-screen').then(m => ({ default: m.InspectionScheduleScreen })));
const MealOrdersScreen = lazyWithRetry(() => import('./components/meal-orders-screen').then(m => ({ default: m.MealOrdersScreen })));
const MonitoringDashboard = lazyWithRetry(() => import('./components/monitoring-dashboard').then(m => ({ default: m.MonitoringDashboard })));
const WeeklyInspectionScreen = lazyWithRetry(() => import('./components/weekly-inspection-screen').then(m => ({ default: m.WeeklyInspectionScreen })));
const ChatScreen = lazyWithRetry(() => import('./components/ChatScreen').then(m => ({ default: m.default })));
const ApdInputScreen = lazyWithRetry(() => import('./components/apd-input-screen').then(m => ({ default: m.ApdInputScreen })));
const ApdSettingsScreen = lazyWithRetry(() => import('./components/apd-settings-screen').then(m => ({ default: m.ApdSettingsScreen })));
const ApdMonitoringScreen = lazyWithRetry(() => import('./components/apd-monitoring-screen').then(m => ({ default: m.ApdMonitoringScreen })));
const InduksiScreen = lazyWithRetry(() => import('./components/induksi-screen').then(m => ({ default: m.InduksiScreen })));
const HomeScreen = lazyWithRetry(() => import('./components/home-screen').then(m => ({ default: m.HomeScreen })));
const ParampaaArcadeScreen = lazyWithRetry(() => import('./components/ParampaaArcadeScreen').then(m => ({ default: m.ParampaaArcadeScreen })));
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
const ClinicScreen = lazyWithRetry(() => import('./components/clinic-screen').then(m => ({ default: m.ClinicScreen })));
const EmployeeLeavesScreen = lazyWithRetry(() => import('./components/employee-leaves-screen').then(m => ({ default: m.EmployeeLeavesScreen })));
const EmployeeLeaveFormScreen = lazyWithRetry(() => import('./components/employee-leave-form-screen').then(m => ({ default: m.EmployeeLeaveFormScreen })));
const XrfCalibrationScreen = lazyWithRetry(() => import('./components/xrf-calibration/XrfCalibrationScreen').then(m => ({ default: m.XrfCalibrationScreen })));
const ScreenTestSmelterScreen = lazyWithRetry(() => import('./components/screen-test/ScreenTestSmelterScreen').then(m => ({ default: m.ScreenTestSmelterScreen })));
const DailyPerformanceScreen = lazyWithRetry(() => import('./components/daily-performance/DailyPerformanceScreen').then(m => ({ default: m.DailyPerformanceScreen })));
const GuestMonitoringScreen = lazyWithRetry(() => import('./components/GuestMonitoringScreen').then(m => ({ default: m.GuestMonitoringScreen })));
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

  // Global App State
  const navigate = useNavigate();
  const location = useLocation();

  // Easter Egg State
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showEasterEgg, setShowEasterEgg] = useState(false);

  const handleLogoClick = () => {
    navigate('/home');
    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);
    if (newCount >= 5) {
      setShowEasterEgg(true);
      setLogoClickCount(0);
    }
  };
  const activeTab = (location.pathname === '/' || location.pathname === '/home') ? 'home' : location.pathname.substring(1);
  const isAutoHide = activeTab !== 'home';
  const [isSidebarPeeked, setIsSidebarPeeked] = useState(false);
  const isBulletin = location.pathname.startsWith('/bulletin');
  const isEmployeeDatabase = location.pathname.startsWith('/employee-database');
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

  // Mendaftarkan handler universal agar setiap input attachment bisa menerima Ctrl+V gambar
  useEffect(() => {
    return setupGlobalAttachmentPaste();
  }, []);

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
      if (savedAvatar && savedAvatar.trim()) {
        raw = savedAvatar;
      }
    }
    if (!raw && userProfile?.avatar) {
      raw = userProfile.avatar;
    }
    // Fallback to employee database official photo
    if (!raw && userProfile?.photo) {
      raw = userProfile.photo;
    }
    return raw ? formatAvatarUrl(raw, 400) : null;
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

    return () => {
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
    return nik === 'MEETINGROOM' || nik === 'MEETING' || nik === 'MEETINGROOMGTS' || nik.includes('MEETING');
  }, [inspectorNik]);

  const [meetingRoomDevUnlocked, setMeetingRoomDevUnlocked] = useState(false);
  const [showMeetingRoomDevModal, setShowMeetingRoomDevModal] = useState(false);

  useEffect(() => {
    const handleUnlocked = () => setMeetingRoomDevUnlocked(true);
    window.addEventListener('meetingroom-dev-unlocked', handleUnlocked);
    return () => window.removeEventListener('meetingroom-dev-unlocked', handleUnlocked);
  }, []);

  const isDeveloper = React.useMemo(() => {
    if (isMeetingRoom) return true; // Akun meetingroom sebagai dev full
    if (
      inspectorNik === '02D25000055' ||
      inspectorNik === '02D24000043' ||
      inspectorNik === '04D21001047' || // Sukarman A. Akil, ST
      inspectorNik === '04D24000042' || // Junjunan Muhammad Syukur
      inspectorNik === 'M0403240177' || // Aldy Aldersun Puluh
      inspectorNik === 'preplabadmin'
    ) return true;
    return developerList.some(d => d.nik === inspectorNik);
  }, [inspectorNik, developerList, isMeetingRoom]);

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
    const nik = (inspectorNik || '').trim();
    const name = (inspectorName || '').toLowerCase();
    if (nik === 'M0401260003' || name.includes('sarjon')) return true;
    const sec = (userProfile?.section || '').toLowerCase();
    const jab = (userProfile?.jabatan || localStorage.getItem('p2h_inspector_jabatan') || '').toLowerCase();
    const role = (userProfile?.role || '').toLowerCase();
    return sec.includes('maint') || sec.includes('pemeliharaan') || 
           jab.includes('maint') || jab.includes('mekanik') || jab.includes('listrik') || 
           jab.includes('electric') || jab.includes('welder') || jab.includes('teknisi') ||
           role.includes('maint') || role.includes('teknisi');
  }, [isCrewRole, userProfile, inspectorNik, inspectorName]);

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

  const isManager = React.useMemo(() => {
    const jab = (userProfile?.jabatan || localStorage.getItem('p2h_inspector_jabatan') || '').toLowerCase();
    const role = (userProfile?.role || '').toLowerCase();
    return jab.includes('manager') || role.includes('manager');
  }, [userProfile]);

  const isDevOrManager = Boolean(isDeveloper || isManager);

  const defaultUserUniverse: 'TBP' | 'GTS' = React.useMemo(() => {
    return userProfile?.pt === 'GTS' ? 'GTS' : 'TBP';
  }, [userProfile]);

  const [activeUniverse, setActiveUniverse] = useState<'TBP' | 'GTS'>(() => {
    const saved = localStorage.getItem('portal_active_universe') || localStorage.getItem('bulletin_active_universe');
    if (saved === 'GTS' || saved === 'TBP') return saved;
    try {
      const p = JSON.parse(localStorage.getItem('p2h_inspector_profile') || '{}');
      if (p.pt === 'GTS') return 'GTS';
    } catch (e) {}
    return 'TBP';
  });

  // Effective universe: strictly locked to defaultUserUniverse unless user is developer
  const effectiveUniverse: 'TBP' | 'GTS' = isDeveloper ? activeUniverse : defaultUserUniverse;

  const handleSwitchUniverse = (targetUniv: 'TBP' | 'GTS') => {
    if (!isDeveloper) return;
    setActiveUniverse(targetUniv);
    localStorage.setItem('portal_active_universe', targetUniv);
    localStorage.setItem('bulletin_active_universe', targetUniv);
    window.dispatchEvent(new CustomEvent('portal-universe-changed', { detail: { universe: targetUniv } }));
    toast.success(`Beralih ke Universe ${targetUniv === 'GTS' ? 'PT. Gane Tambang Sentosa (GTS)' : 'PT. Trimegah Bangun Persada (TBP / GPS)'}`);
  };

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


  const [showProfileScreen, setShowProfileScreen] = useState(false);
  const [showModulesDrawer, setShowModulesDrawer] = useState(false);
  const [showBulletinMenu, setShowBulletinMenu] = useState(false);
  const [showHazardReportModal, setShowHazardReportModal] = useState(false);
  const [showChatDrawer, setShowChatDrawer] = useState(false);
  const [loading, setLoading] = useState(true);

  // Listen for global open sap drawer and chat drawer requests
  useEffect(() => {
    const handleOpenSap = () => {
      handleNav('safety-rekap');
    };
    const handleOpenChat = () => setShowChatDrawer(true);
    window.addEventListener('open-sap-drawer', handleOpenSap);
    window.addEventListener('open-chat-drawer', handleOpenChat);
    return () => {
      window.removeEventListener('open-sap-drawer', handleOpenSap);
      window.removeEventListener('open-chat-drawer', handleOpenChat);
    };
  }, []);

  // Listen for global open hazard report modal requests
  useEffect(() => {
    const handleOpenHazard = () => {
      handleNav('safety-rekap');
    };
    window.addEventListener('open-hazard-report-modal', handleOpenHazard);
    return () => window.removeEventListener('open-hazard-report-modal', handleOpenHazard);
  }, []);

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
    const allowedCrewPaths = ['', 'home', 'quiz', 'clinic', 'kunjungan-klinik', 'employee-leaves', 'izin-karyawan', 'pelaporan-izin', 'form-izin', 'rekapan-izin', 'form-izin', 'rekapan-izin', 'settings', 'logbook'];
    if (isMaintenanceCrew) {
      allowedCrewPaths.push('wo-list', 'wo-maintenance-dashboard', 'wo-dashboard');
    }
    const isAllowed = allowedCrewPaths.includes(path) || path.startsWith('bulletin');
    if (path && !isAllowed) {
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
    // Dynamic text contrast: warna teks tema dikoreksi otomatis terhadap kecerahan background tema
    Object.entries(withReadableThemeColors(actualColors)).forEach(([key, value]) => {
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
          } else if (data.employee.photo) {
            localStorage.setItem(`p2h_inspector_avatar_${inspectorNik}`, data.employee.photo);
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

    // If navigating directly to root bulletin/labnote, clear remembered page so user always lands on initial dashboard
    if (cleanTab.startsWith('bulletin') && !cleanTab.includes('?')) {
      try {
        localStorage.removeItem("preplab_active_bulletin_page");
        sessionStorage.removeItem("preplab_cached_selected_post");
      } catch {}
    }

    // Role guard for Crew: restrict navigation to allowed modules only
    if (isCrewRole) {
      const allowedCrewTabs = ['home', '', 'quiz', 'clinic', 'kunjungan-klinik', 'employee-leaves', 'izin-karyawan', 'pelaporan-izin', 'settings', 'logbook'];
      if (isMaintenanceCrew) {
        allowedCrewTabs.push('wo-list', 'wo-maintenance-dashboard', 'wo-dashboard');
      }
      if (!allowedCrewTabs.includes(cleanTab) && !cleanTab.startsWith('bulletin')) {
        toast.error('Akses modul ini tidak tersedia untuk akun Crew.');
        navigate('/');
        return;
      }
    }

    if (cleanTab === 'logbook') {
      const targetUniverse = effectiveUniverse;
      const allowedSecs = getUserAllowedSections(userProfile);
      const userSec = allowedSecs[0] || userProfile?.department || userProfile?.seksi || 'Preparasi';
      navigate(`/bulletin/${targetUniverse}?sectionLogbook=${encodeURIComponent(userSec)}`);
      return;
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
  const [isDevLogin, setIsDevLogin] = useState(false);
  const [loginUniverse, setLoginUniverse] = useState<'TBP' | 'GTS'>('TBP');
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
             const validNik = data.employee?.nik || data.nik || inputNik;
             const validUsername = data.employee?.username || data.username || '';
             const cleanUpper = validNik.toUpperCase();
             const inputUpper = inputNik.toUpperCase();
             const isDev = Boolean(
               data.isDeveloper ||
               ['02D25000055', '02D24000043', '04D21001047', '04D24000042', 'M0403240177', 'PREPLABADMIN'].includes(cleanUpper) ||
               ['02D25000055', '02D24000043', '04D21001047', '04D24000042', 'M0403240177', 'PREPLABADMIN', 'ALVIN'].includes(inputUpper) ||
               developerList.some(d => d.nik?.toUpperCase() === cleanUpper || (d.username && d.username.toUpperCase() === inputUpper))
             );
             setIsDevLogin(isDev);
             const detectedPt = ((data.pt || data.employee?.pt || '') as string).toUpperCase();
             const isGtsEmployee = detectedPt === 'GTS' || detectedPt.includes('GTS') || cleanUpper.startsWith('04D') || inputUpper.startsWith('04D');
             const autoUniverse: 'TBP' | 'GTS' = isGtsEmployee ? 'GTS' : 'TBP';

             if (isDev) {
               const initialUniv: 'TBP' | 'GTS' = isGtsEmployee 
                 ? 'GTS' 
                 : ((localStorage.getItem('portal_active_universe') === 'GTS') ? 'GTS' : 'TBP');
               setLoginUniverse(initialUniv);
             } else {
               setLoginUniverse(autoUniverse);
             }
             
             if (isCrew) {
                 toast.success("Login otomatis sebagai Crew!");
                 setInspectorNik(validNik);
                 setInspectorName(data.employee?.name || data.name);
                 localStorage.setItem('p2h_inspector_nik', validNik);
                 localStorage.setItem('p2h_inspector_name', data.employee?.name || data.name);
                 localStorage.setItem('p2h_inspector_jabatan', data.employee?.jabatan || 'Crew');
                 if (data.employee) localStorage.setItem('p2h_inspector_profile', JSON.stringify(data.employee));
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
                  const userPt = ((data.employee?.pt || '') as string).toUpperCase();
                  const empNik = ((data.employee?.nik || validNik || '') as string).toUpperCase();
                  const isGts = userPt === 'GTS' || userPt.includes('GTS') || empNik.startsWith('04D');
                  const targetUniverse: 'TBP' | 'GTS' = isDevLogin
                      ? loginUniverse
                      : (isGts ? 'GTS' : 'TBP');
                  localStorage.setItem('portal_active_universe', targetUniverse);
                  localStorage.setItem('bulletin_active_universe', targetUniverse);
                  setActiveUniverse(targetUniverse);
                  window.dispatchEvent(new CustomEvent('portal-universe-changed', { detail: { universe: targetUniverse } }));
                  toast.success(`Login berhasil (${targetUniverse === 'GTS' ? 'PT. GTS' : 'PT. TBP - GPS'})`);
                  setLoginStep('nik');
                  setIsDevLogin(false);
                  setPasswordInput('');
                  setShowPassword(false);

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
    setIsDevLogin(false);
    setLoginStep('nik');
    setPasswordInput('');
    toast.success('Sesi berhasil diakhiri.');
    handleNav('home');
  };

  // TIER 0: GUEST & AUDITOR ACCESS (Zero friction, no login required)
  if (location.pathname.startsWith('/guest')) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased selection:bg-teal-500 selection:text-white">
        <Suspense fallback={
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-teal-600 border-t-transparent" />
          </div>
        }>
          <Routes>
            <Route path="/guest/monitoring" element={<GuestMonitoringScreen />} />
            <Route path="*" element={<Navigate to="/guest/monitoring" replace />} />
          </Routes>
        </Suspense>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7F6] flex items-center justify-center text-teal-600">
        <Activity className="animate-spin w-8 h-8" />
      </div>
    );
  }

  // Check if opened in Embed / Presentation mode (e.g. PowerPoint Web Viewer)
  const isEmbedMode = typeof window !== 'undefined' && (
    new URLSearchParams(window.location.search).get('embed') === 'true'
  );

  // TIER 2: Inspektor Login (Kiosk mode) & Google Login
  if (isGoogleLoading && !isEmbedMode) {
    return <div className="min-h-screen bg-[#F4F7F6] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700"></div></div>;
  }
      if (!inspectorNik && !inspectorName && !isEmbedMode) {
    return (
      <div className="min-h-screen w-full relative flex flex-col items-center justify-center px-4 py-12 selection:bg-[#22a7b8] selection:text-white font-sans overflow-x-hidden">

        {/* Enterprise Clean White Background with subtle soft ambient light (Same as Database Karyawan) */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50/80 to-[#f0fdfa] z-0 pointer-events-none">
          {/* Subtle Grid overlay */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMTksOTQsMTA1LDAuMDQpIi8+PC9zdmc+')] [mask-image:linear-gradient(to_bottom,white,transparent)] z-0"></div>
          {/* Soft glowing orbs */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#22a7b8]/10 rounded-full blur-3xl -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#f09b13]/10 rounded-full blur-3xl translate-y-1/2"></div>
        </div>

        {/* Center Content Container - No Card, Open & Floating Center */}
        <div className="relative z-10 w-full max-w-2xl mx-auto flex flex-col items-center text-center">

          {/* PrepLab Official Logo */}
          <div className="mb-3.5 group">
            <img 
              src="/preplab-logo.png" 
              alt="PrepLab" 
              className="h-14 sm:h-16 md:h-20 w-auto object-contain filter drop-shadow-sm hover:scale-105 transition-transform duration-300 select-none"
            />
          </div>

          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f09b13] text-white text-xs font-extrabold uppercase tracking-wider mb-4 shadow-md ring-2 ring-[#f09b13]/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Portal Gateway</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-3 tracking-tight">
            Preparation &amp; Laboratory
          </h1>

          {/* Subtitle */}
          <p className="text-slate-500 text-sm md:text-base max-w-xl mx-auto font-medium tracking-wide">
            Quality Assurance &amp; Laboratorium Division
          </p>

          {/* Form Area - Centered Floating Input Bar */}
          <form onSubmit={handleNikLogin} className="w-full max-w-xl mx-auto mt-8">
            {loginStep === 'nik' && (
              <div className="w-full relative group animate-in fade-in duration-300">
                <div className="absolute inset-0 bg-[#22a7b8]/15 blur-xl rounded-full transition-opacity group-hover:opacity-100 opacity-60"></div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ketik NIK atau Username..."
                    value={nikInput}
                    onChange={e => setNikInput(e.target.value)}
                    required
                    autoFocus
                    className="w-full rounded-2xl shadow-sm border border-slate-200 focus:ring-4 focus:ring-[#22a7b8]/20 focus:border-[#22a7b8] bg-white pl-12 pr-32 py-4 sm:py-5 text-base sm:text-lg text-slate-800 placeholder:text-slate-400 font-mono tracking-wide transition-all outline-none"
                  />
                  <User className="absolute left-4 w-5 h-5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <button
                    type="submit"
                    disabled={isVerifyingNik || !nikInput.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 sm:py-3 rounded-xl bg-[#22a7b8] hover:bg-[#1b8f9e] text-white font-bold text-sm tracking-wide transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                  >
                    {isVerifyingNik ? (
                      <>
                        <Activity className="w-4 h-4 animate-spin" />
                        <span className="hidden sm:inline">Cek...</span>
                      </>
                    ) : (
                      <>
                        <span>Masuk</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
                <p className="text-center text-xs text-slate-400 mt-2.5 font-mono">
                  Contoh: 02D... atau username akun
                </p>
              </div>
            )}

            {loginStep === 'password' && (
              <div className="w-full space-y-3 animate-in fade-in duration-300 text-left">
                {/* Selected Account Pill */}
                <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#22a7b8] flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono block font-semibold">Akun Terpilih</span>
                      <span className="text-xs font-bold text-slate-800 font-mono">{nikInput}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginStep('nik');
                      setIsDevLogin(false);
                      setPasswordInput('');
                    }}
                    className="text-xs font-bold text-[#22a7b8] hover:text-[#1b8f9e] underline cursor-pointer"
                  >
                    Ganti Akun
                  </button>
                </div>


                {/* Password Input Bar */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-[#22a7b8]/15 blur-xl rounded-full transition-opacity group-hover:opacity-100 opacity-60"></div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Masukkan Password Akun..."
                      value={passwordInput}
                      onChange={e => setPasswordInput(e.target.value)}
                      required
                      autoFocus
                      className="w-full rounded-2xl shadow-sm border border-slate-200 focus:ring-4 focus:ring-[#22a7b8]/20 focus:border-[#22a7b8] bg-white pl-12 pr-40 py-4 sm:py-5 text-base sm:text-lg text-slate-800 placeholder:text-slate-400 transition-all outline-none"
                    />
                    <Lock className="absolute left-4 w-5 h-5 top-1/2 -translate-y-1/2 text-slate-400" />
                    
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-32 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1.5 cursor-pointer"
                      title={showPassword ? "Sembunyikan password" : "Lihat password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4 text-slate-600" /> : <Eye className="w-4 h-4" />}
                    </button>

                    <button
                      type="submit"
                      disabled={isVerifyingNik || !passwordInput.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 sm:py-3 rounded-xl bg-[#22a7b8] hover:bg-[#1b8f9e] text-white font-bold text-sm tracking-wide transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                    >
                      {isVerifyingNik ? (
                        <>
                          <Activity className="w-4 h-4 animate-spin" />
                          <span className="hidden sm:inline">Verifikasi...</span>
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-4 h-4" />
                          <span>Masuk</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setLoginStep('forgot')}
                    className="text-xs text-[#22a7b8] hover:text-[#1b8f9e] font-semibold transition-colors cursor-pointer"
                  >
                    Lupa Password?
                  </button>
                </div>
              </div>
            )}

            {loginStep === 'setup' && (
              <div className="w-full max-w-md mx-auto bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-3.5 text-left animate-in fade-in duration-300">
                <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs">
                  <p className="font-bold flex items-center gap-1.5 mb-0.5 text-teal-900">
                    <Sparkles className="w-3.5 h-3.5 text-[#22a7b8]" />
                    <span>Setup Akun Pertama Kali</span>
                  </p>
                  <p className="text-[11px] text-teal-700">Lengkapi data di bawah untuk mengamankan akun Anda.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700">Email Aktif (Reset Password)</label>
                  <input 
                    type="email"
                    placeholder="nama@haritanickel.com"
                    value={setupEmail}
                    onChange={e => setSetupEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder:text-slate-400 text-xs focus:outline-none focus:bg-white focus:border-[#22a7b8] focus:ring-1 focus:ring-[#22a7b8]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-700">Password Baru</label>
                    <button
                      type="button"
                      onClick={() => setShowSetupPassword1(!showSetupPassword1)}
                      className="text-[10px] text-[#22a7b8] hover:text-[#1b8f9e] flex items-center gap-1 cursor-pointer font-medium"
                    >
                      {showSetupPassword1 ? <EyeOff className="w-3 h-3 text-[#22a7b8]" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      type={showSetupPassword1 ? "text" : "password"}
                      placeholder="Minimal 6 karakter"
                      value={setupPassword1}
                      onChange={e => setSetupPassword1(e.target.value)}
                      required
                      className="w-full px-3 py-2 pr-9 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder:text-slate-400 text-xs focus:outline-none focus:bg-white focus:border-[#22a7b8] focus:ring-1 focus:ring-[#22a7b8]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSetupPassword1(!showSetupPassword1)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      {showSetupPassword1 ? <EyeOff className="w-3.5 h-3.5 text-slate-600" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-700">Konfirmasi Password Baru</label>
                    <button
                      type="button"
                      onClick={() => setShowSetupPassword2(!showSetupPassword2)}
                      className="text-[10px] text-[#22a7b8] hover:text-[#1b8f9e] flex items-center gap-1 cursor-pointer font-medium"
                    >
                      {showSetupPassword2 ? <EyeOff className="w-3 h-3 text-[#22a7b8]" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      type={showSetupPassword2 ? "text" : "password"}
                      placeholder="Ulangi password baru"
                      value={setupPassword2}
                      onChange={e => setSetupPassword2(e.target.value)}
                      required
                      className="w-full px-3 py-2 pr-9 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder:text-slate-400 text-xs focus:outline-none focus:bg-white focus:border-[#22a7b8] focus:ring-1 focus:ring-[#22a7b8]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSetupPassword2(!showSetupPassword2)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      {showSetupPassword2 ? <EyeOff className="w-3.5 h-3.5 text-slate-600" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isVerifyingNik} 
                  className="w-full py-3 rounded-xl bg-[#22a7b8] hover:bg-[#1b8f9e] text-white font-bold text-xs tracking-wide transition-all shadow-xs active:scale-95 cursor-pointer mt-2"
                >
                  {isVerifyingNik ? 'Menyimpan...' : 'Simpan Password & Profil'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setLoginStep('nik')} 
                  className="w-full py-2 text-xs text-slate-500 hover:text-slate-700 font-medium cursor-pointer transition-colors"
                >
                  Batal
                </button>
              </div>
            )}

            {loginStep === 'forgot' && (
              <div className="w-full max-w-md mx-auto bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-3.5 text-left animate-in fade-in duration-300">
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  <p className="font-bold mb-0.5 text-amber-900">Reset Password Mandiri</p>
                  <p className="text-[11px] text-amber-700">Masukkan email aktif yang terdaftar pada akun Anda.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700">Nomor Induk Karyawan (NIK)</label>
                  <input 
                    type="text"
                    value={nikInput}
                    disabled
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-mono text-xs cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700">Email Terdaftar</label>
                  <input 
                    type="email"
                    placeholder="nama@haritanickel.com"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder:text-slate-400 text-xs focus:outline-none focus:bg-white focus:border-[#22a7b8]"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isVerifyingNik} 
                  className="w-full py-3 rounded-xl bg-[#f09b13] hover:bg-[#dc8c0f] text-white font-bold text-xs tracking-wide transition-all shadow-xs active:scale-95 cursor-pointer mt-2"
                >
                  {isVerifyingNik ? 'Memproses...' : 'Kirim Link Reset'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setLoginStep('password')} 
                  className="w-full py-2 text-xs text-slate-500 hover:text-slate-700 font-medium cursor-pointer transition-colors"
                >
                  Batal
                </button>
              </div>
            )}
          </form>

          {/* 3 Operating Entities Cards Row (TBP, GPS, GTS) */}
          <div className="w-full max-w-xl mt-8">
            {isDevLogin && loginStep === 'password' && (
              <div className="flex items-center justify-between mb-3 px-1 animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <Database className="w-3.5 h-3.5 text-[#22a7b8]" />
                  <span>Pilih Database Operasional:</span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                  Target: <strong>{loginUniverse === 'TBP' ? 'PT TBP & GPS' : 'PT GTS'}</strong>
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {/* Card 1: TBP */}
              <button
                type="button"
                onClick={() => {
                  if (isDevLogin && loginStep === 'password') setLoginUniverse('TBP');
                }}
                disabled={!isDevLogin || loginStep !== 'password'}
                className={`relative rounded-2xl p-3.5 flex flex-col items-center justify-center text-center transition-all duration-200 group text-left ${
                  isDevLogin && loginStep === 'password'
                    ? loginUniverse === 'TBP'
                      ? 'bg-teal-50/50 border-2 border-[#22a7b8] ring-2 ring-[#22a7b8]/30 shadow-md cursor-pointer'
                      : 'bg-white border border-slate-200/90 hover:border-teal-300 opacity-60 hover:opacity-100 cursor-pointer hover:shadow-sm'
                    : 'bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-teal-300 cursor-default'
                }`}
              >
                {isDevLogin && loginStep === 'password' && loginUniverse === 'TBP' && (
                  <span className="absolute top-2 right-2 flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#22a7b8] text-white shadow-xs">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Aktif
                  </span>
                )}
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 p-1.5 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <img src="/tbp-header-logo.png" alt="TBP" className="w-full h-full object-contain" />
                </div>
                <span className={`text-xs font-bold ${isDevLogin && loginStep === 'password' && loginUniverse === 'TBP' ? 'text-teal-900 font-extrabold' : 'text-slate-800'}`}>
                  PT TBP
                </span>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5">Trimegah Bangun Persada</span>
                {isDevLogin && loginStep === 'password' && (
                  <span className="text-[9px] text-[#1b8f9e] font-semibold mt-1">Database TBP-GPS</span>
                )}
              </button>

              {/* Card 2: GPS */}
              <button
                type="button"
                onClick={() => {
                  if (isDevLogin && loginStep === 'password') setLoginUniverse('TBP');
                }}
                disabled={!isDevLogin || loginStep !== 'password'}
                className={`relative rounded-2xl p-3.5 flex flex-col items-center justify-center text-center transition-all duration-200 group text-left ${
                  isDevLogin && loginStep === 'password'
                    ? loginUniverse === 'TBP'
                      ? 'bg-teal-50/50 border-2 border-[#22a7b8] ring-2 ring-[#22a7b8]/30 shadow-md cursor-pointer'
                      : 'bg-white border border-slate-200/90 hover:border-teal-300 opacity-60 hover:opacity-100 cursor-pointer hover:shadow-sm'
                    : 'bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-300 cursor-default'
                }`}
              >
                {isDevLogin && loginStep === 'password' && loginUniverse === 'TBP' && (
                  <span className="absolute top-2 right-2 flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#22a7b8] text-white shadow-xs">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Aktif
                  </span>
                )}
                <div className="w-10 h-10 rounded-xl bg-blue-50/60 border border-blue-100/80 p-1.5 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <img src="/gps-logo.png" alt="GPS" className="w-full h-full object-contain" />
                </div>
                <span className={`text-xs font-bold ${isDevLogin && loginStep === 'password' && loginUniverse === 'TBP' ? 'text-teal-900 font-extrabold' : 'text-blue-700'}`}>
                  PT GPS
                </span>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5">Gane Permai Sentosa</span>
                {isDevLogin && loginStep === 'password' && (
                  <span className="text-[9px] text-[#1b8f9e] font-semibold mt-1">Database TBP-GPS</span>
                )}
              </button>

              {/* Card 3: GTS */}
              <button
                type="button"
                onClick={() => {
                  if (isDevLogin && loginStep === 'password') setLoginUniverse('GTS');
                }}
                disabled={!isDevLogin || loginStep !== 'password'}
                className={`relative rounded-2xl p-3.5 flex flex-col items-center justify-center text-center transition-all duration-200 group text-left ${
                  isDevLogin && loginStep === 'password'
                    ? loginUniverse === 'GTS'
                      ? 'bg-teal-50/50 border-2 border-[#22a7b8] ring-2 ring-[#22a7b8]/30 shadow-md cursor-pointer'
                      : 'bg-white border border-slate-200/90 hover:border-teal-300 opacity-60 hover:opacity-100 cursor-pointer hover:shadow-sm'
                    : 'bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-300 cursor-default'
                }`}
              >
                {isDevLogin && loginStep === 'password' && loginUniverse === 'GTS' && (
                  <span className="absolute top-2 right-2 flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#22a7b8] text-white shadow-xs">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Aktif
                  </span>
                )}
                <div className="w-10 h-10 rounded-xl bg-blue-50/60 border border-blue-100/80 p-1.5 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                  <img src="/gts-logo.png" alt="GTS" className="w-full h-full object-contain" />
                </div>
                <span className={`text-xs font-bold ${isDevLogin && loginStep === 'password' && loginUniverse === 'GTS' ? 'text-teal-900 font-extrabold' : 'text-blue-700'}`}>
                  PT GTS
                </span>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5">Gane Tambang Sentosa</span>
                {isDevLogin && loginStep === 'password' && (
                  <span className="text-[9px] text-[#1b8f9e] font-semibold mt-1">Database GTS</span>
                )}
              </button>
            </div>

            {isDevLogin && loginStep === 'password' && (
              <p className="text-[11px] text-slate-500 font-medium text-center mt-3 animate-in fade-in">
                * Sesi login akan tersambung ke database <strong>{loginUniverse === 'TBP' ? 'PT. TBP & GPS' : 'PT. GTS'}</strong>. Klik logo perusahaan di atas untuk beralih.
              </p>
            )}
          </div>

          {/* Bottom Trust & Motto */}
          <div className="mt-8 flex items-center justify-center gap-3 text-xs text-slate-500 font-mono">
            <span className="flex items-center gap-1.5 text-slate-600">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>SSL 256-Bit Encrypted</span>
            </span>
            <span className="text-slate-300">&bull;</span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">v2.6 Enterprise</span>
          </div>

          <div className="mt-3 text-center text-xs">
            <p className="font-semibold text-slate-600">Divisi Quality Assurance &amp; Laboratorium &bull; Harita Nickel</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Safety &bull; Precision &bull; Integrity &bull; Continuous Improvement</p>
          </div>

        </div>

      </div>
    );
  }

  return (
    <div className="flex w-full min-h-[100dvh] h-[100dvh] overflow-hidden transition-colors duration-300" style={{ backgroundColor: activeModuleStyle.bg }}>
      {/* 0. Left Edge Hover Trigger: Desktop only (Hidden on Mobile) */}
      {isAutoHide && !isCrewRole && (
        <div 
          className="hidden md:block fixed top-0 left-0 w-4.5 h-[100dvh] z-40 cursor-pointer pointer-events-auto select-none"
          onMouseEnter={() => setIsSidebarPeeked(true)}
          title="Arahkan kursor ke sini untuk membuka menu sidebar"
        />
      )}

      {/* 1. Left Sidebar: Full-height past the header, unified navigation rail (Desktop only, strictly hidden on mobile and in embed mode) */}
      {!isCrewRole && !isEmbedMode && (
        <aside 
          onMouseEnter={() => {
            if (isAutoHide) setIsSidebarPeeked(true);
          }}
          onMouseLeave={() => {
            setHoveredNav(null);
            if (isAutoHide) setIsSidebarPeeked(false);
          }}
          className={`hidden md:flex flex-col items-center w-20 lg:w-22 shrink-0 select-none py-3 justify-between overflow-y-auto overflow-x-hidden ${
            isAutoHide
              ? `fixed top-0 left-0 h-[100dvh] z-50 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isSidebarPeeked 
                    ? 'translate-x-0 shadow-2xl pointer-events-auto opacity-100' 
                    : '-translate-x-full pointer-events-none opacity-0'
                }`
              : 'relative h-[100dvh] z-50 transition-all duration-300'
          }`}
          style={{
            background: 'linear-gradient(180deg, #1da8b5 0%, #168a96 45%, #106771 100%)',
            boxShadow: isAutoHide && isSidebarPeeked
              ? 'inset -1px 0 0 0 rgba(255,255,255,0.22), 8px 0 32px rgba(0,0,0,0.32)'
              : 'inset -1px 0 0 0 rgba(255,255,255,0.18), 4px 0 20px rgba(0,0,0,0.08)',
            willChange: 'transform, opacity'
          }}
        >
          {/* Top Branding Section with PrepLab & HARITA NICKEL */}
          <div 
            className="flex flex-col items-center justify-center w-full px-1 pt-1 pb-1.5 select-none cursor-pointer group"
            onClick={() => {
              if (isAutoHide) setIsSidebarPeeked(false);
              handleLogoClick();
            }}
            title="Beranda PrepLab"
          >
            <div 
              className="w-9 h-9 lg:w-10 lg:h-10 rounded-2xl bg-white/15 p-1.5 flex items-center justify-center border border-white/25 shadow-md mb-1.5 backdrop-blur-xs group-hover:scale-105 active:scale-95 transition-transform"
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

          {/* Universe Switcher (Developer Only) or Assigned Entity Badge */}
          {isDeveloper ? (
            <div className="w-full px-2 py-1 my-0.5 flex flex-col items-center">
              <div className="w-full bg-black/25 p-1 rounded-xl border border-white/15 flex flex-col items-center gap-1 shadow-xs">
                <span className="text-[7px] font-black uppercase tracking-wider text-teal-100/80">
                  Universe
                </span>
                <div className="flex w-full rounded-lg bg-black/35 p-0.5 gap-0.5">
                  <button
                    onClick={() => handleSwitchUniverse('TBP')}
                    className={`flex-1 py-0.5 rounded text-[8.5px] font-black transition-all cursor-pointer ${
                      effectiveUniverse === 'TBP'
                        ? 'bg-teal-500 text-white shadow-xs'
                        : 'text-white/60 hover:text-white'
                    }`}
                    title="Universe PT Trimegah Bangun Persada (TBP / GPS)"
                  >
                    TBP
                  </button>
                  <button
                    onClick={() => handleSwitchUniverse('GTS')}
                    className={`flex-1 py-0.5 rounded text-[8.5px] font-black transition-all cursor-pointer ${
                      effectiveUniverse === 'GTS'
                        ? 'bg-teal-500 text-white shadow-xs'
                        : 'text-white/60 hover:text-white'
                    }`}
                    title="Universe PT Gane Tambang Sentosa (GTS)"
                  >
                    GTS
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="my-0.5 px-2 py-0.5 text-center">
              <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/90 font-black text-[7.5px] uppercase tracking-wider border border-white/15">
                {effectiveUniverse === 'GTS' ? 'PT GTS' : 'PT TBP'}
              </span>
            </div>
          )}

          {/* Navigation Items List with Smooth Follower Notch (Merged Left & Right Rails) */}
          <div className="flex flex-col items-center w-full flex-1 gap-1 pt-1 overflow-y-auto no-scrollbar">
            {[
              {
                id: 'home',
                label: 'Home',
                icon: Home,
                onClick: () => handleNav('home'),
                title: 'Beranda / Home',
              },
              {
                id: 'modules',
                label: 'Menu',
                icon: LayoutGrid,
                onClick: () => setShowModulesDrawer(true),
                title: 'Buka Semua Menu & Modul Portal',
              },
              {
                id: 'bulletin',
                label: 'Labnote',
                icon: FileText,
                onClick: () => {
                  handleNav(`bulletin/${effectiveUniverse}`);
                },
                title: 'Labnote & Pengumuman',
              },
              {
                id: 'cloud',
                label: 'Cloud',
                icon: Cloud,
                onClick: () => handleNav('preplab-cloud'),
                title: 'PrepLab Cloud Storage',
              },
              {
                id: 'chat',
                label: 'Chat',
                icon: MessageSquare,
                onClick: () => setShowChatDrawer(true),
                title: 'Buka Portal Chat (Global & Section)',
              },
              {
                id: 'leaderboard',
                label: 'Rank',
                icon: Trophy,
                onClick: () => handleNav('leaderboard'),
                title: 'PrepLab Hall of Fame & Leaderboard',
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
        className="flex-1 h-[100dvh] relative transition-all duration-300 overflow-x-hidden overflow-y-auto"
        style={{ backgroundColor: activeModuleStyle.bg, color: 'var(--text-main, #000000)' }}
      >
        {appEnv === 'staging' && (
          <div className="w-full bg-orange-500 text-white text-xs font-bold py-1 px-4 text-center z-[100] relative tracking-widest uppercase">
            STAGING ENVIRONMENT - DATA TEST
          </div>
        )}
        <div className="flex flex-col pb-24 md:pb-6 relative min-h-[100dvh]">
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

          {/* Daily Splash Screen (Cross-device synced 1x per day via Server API, strictly on initial Home startup) */}
          {activeTab === 'home' && (
            <DailySplashScreen
              userName={inspectorName || undefined}
              userNik={inspectorNik || undefined}
              isHome={activeTab === 'home'}
            />
          )}
          
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-slate-200/50 to-transparent pointer-events-none"></div>
      
      {/* Header */}
      <header 
        className={`px-4 md:px-6 lg:px-8 py-3 sticky top-0 z-40 backdrop-blur-md border-b w-full flex justify-center transition-all duration-300 ${
          (isBulletin && bulletinFocusMode) || isEmployeeDatabase || isEmbedMode ? 'hidden' : ''
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
        (isBulletin && bulletinFocusMode) || isEmployeeDatabase ? 'h-[100dvh] overflow-hidden p-0' : 'min-h-full flex-1'
      }`}>
        
      <Suspense fallback={<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
              <AnimatePresence mode="wait">
<Routes location={location} key={location.pathname}>
  <Route 
    path="/" 
    element={
      <HomeScreen inspectorName={inspectorName!} inspectorNik={inspectorNik!} onNav={handleNav} userPt={userProfile?.pt} />
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
  <Route path="/guest/monitoring" element={<GuestMonitoringScreen />} />
  <Route path="/quiz-admin" element={<QuizAdminScreen userSection={userProfile?.section || ''} onBack={() => handleNav('home')} />} />
    <Route path="/parampaa" element={<ParampaaArcadeScreen onBack={() => handleNav('home')} />} />
  <Route path="/arcade" element={<ParampaaArcadeScreen onBack={() => handleNav('home')} />} />
  <Route path="/quiz" element={<QuizScreen inspectorName={inspectorName!} inspectorNik={inspectorNik!} userSection={userProfile?.section || ''} onBack={() => handleNav('home')} />} />
  <Route path="/apd" element={<Navigate to="/apd-input" replace />} />
  <Route path="/apd/*" element={<Navigate to="/apd-input" replace />} />
  <Route path="/apd-input" element={<ApdInputScreen onBack={() => handleNav('home')} onNav={handleNav} inspectorNik={inspectorNik!} inspectorName={inspectorName!} />} />
  <Route path="/apd-settings" element={<ApdSettingsScreen onBack={() => handleNav('home')} onNav={handleNav} />} />
  <Route path="/apd-monitoring" element={<ApdMonitoringScreen onBack={() => handleNav('home')} onNav={handleNav} />} />
  <Route path="/induksi" element={<InduksiScreen />} />
  <Route path="/preplab-cloud" element={<PreplabCloudScreen onBack={() => handleNav('home')} userProfile={userProfile} inspectorNik={inspectorNik!} inspectorName={inspectorName!} isDeveloper={isDeveloper} isManager={isManager} />} />
  <Route path="/manual" element={<UserManualScreen onBack={() => handleNav('home')} onNav={handleNav} />} />
  <Route path="/employee-database" element={<EmployeeDatabaseScreen inspectorNik={inspectorNik!} onBack={() => handleNav('home')} />} />
  <Route path="/employee-leaves" element={<EmployeeLeavesScreen userProfile={userProfile} inspectorName={inspectorName!} inspectorNik={inspectorNik!} userPt={effectiveUniverse || 'TBP'} onNav={handleNav} onBack={() => handleNav('home')} />} />
  <Route path="/rekapan-izin" element={<Navigate to="/employee-leaves" replace />} />
  <Route path="/izin-karyawan" element={<Navigate to="/employee-leaves" replace />} />
  <Route path="/pelaporan-izin" element={<EmployeeLeaveFormScreen inspectorName={inspectorName!} inspectorNik={inspectorNik!} userProfile={userProfile} onNav={handleNav} onBack={() => handleNav('home')} />} />
  <Route path="/form-izin" element={<Navigate to="/pelaporan-izin" replace />} />
  <Route path="/roster-admin" element={<RosterAdminScreen />} />
  <Route path="/training-database" element={<TrainingDatabaseScreen key="internal" scope="internal" inspectorNik={inspectorNik!} inspectorName={inspectorName!} onBack={() => handleNav('home')} />} />
  <Route path="/safety-rekap" element={<SafetyRekapScreen inspectorNik={inspectorNik!} inspectorName={inspectorName!} inspectorRole={userProfile?.jabatan} inspectorSection={userProfile?.section} onBack={() => handleNav('home')} />} />
  <Route path="/inspection-schedule" element={<InspectionScheduleScreen inspectorNik={inspectorNik!} inspectorName={inspectorName!} onBack={() => {
    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get('returnTo');
    if (returnTo) {
      window.location.href = returnTo;
    } else {
      handleNav('home');
    }
  }} />} />
  <Route path="/training-external" element={<TrainingDatabaseScreen key="external" scope="external" inspectorNik={inspectorNik!} inspectorName={inspectorName!} onBack={() => handleNav('home')} />} />
  <Route path="/meal-orders" element={<MealOrdersScreen inspectorNik={inspectorNik!} inspectorName={inspectorName!} onBack={() => handleNav('home')} />} />
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
  <Route path="/bulletin/:pt" element={<BulletinBoard inspectorNik={inspectorNik!} inspectorName={inspectorName!} isDeveloper={isDeveloper} userPt={effectiveUniverse} userProfile={userProfile} />} />
  <Route path="/bulletin" element={<Navigate to={`/bulletin/${effectiveUniverse}`} replace />} />
  <Route path="/agenda" element={<AgendaDashboard key="agenda" inspectorNik={inspectorNik!} inspectorName={inspectorName!} userDept={userDept || undefined} isDeveloper={isDeveloper} />} />
  <Route path="/p5m" element={<P5MScreen onBack={() => handleNav('home')} userProfile={userProfile} />} />
  <Route path="/feedback-support" element={<FeedbackSupportScreen inspectorNik={inspectorNik!} inspectorName={inspectorName!} onBack={() => handleNav('home')} />} />
  <Route path="/finance" element={<FinanceScreen inspectorNik={inspectorNik!} inspectorName={inspectorName!} />} />
  <Route path="/leaderboard" element={<LeaderboardScreen inspectorNik={inspectorNik!} inspectorName={inspectorName!} userProfile={userProfile} onBack={() => handleNav('home')} />} />
  <Route path="/logbook" element={<Navigate to={`/bulletin/${effectiveUniverse}?sectionLogbook=${encodeURIComponent(getUserAllowedSections(userProfile)[0] || 'Preparasi')}`} replace />} />
  <Route path="/clinic" element={<ClinicScreen inspectorName={inspectorName!} inspectorNik={inspectorNik!} userPt={effectiveUniverse} onNav={handleNav} onBack={() => handleNav('home')} />} />
  <Route path="/kunjungan-klinik" element={<Navigate to="/clinic" replace />} />
  <Route path="/xrf-calibration" element={<XrfCalibrationScreen inspectorName={inspectorName!} inspectorNik={inspectorNik!} userPt={effectiveUniverse} onBack={() => handleNav('home')} />} />
  <Route path="/kalibrasi-xrf" element={<Navigate to="/xrf-calibration" replace />} />
  <Route path="/screen-test-smelter" element={<ScreenTestSmelterScreen inspectorName={inspectorName || 'Tamu Presentasi'} inspectorNik={inspectorNik || 'guest'} onBack={() => handleNav('home')} />} />
  <Route path="/screen-test" element={<Navigate to="/screen-test-smelter" replace />} />
  <Route path="/daily-performance" element={<DailyPerformanceScreen inspectorName={inspectorName || 'Tamu Presentasi'} inspectorNik={inspectorNik || 'guest'} userPt={effectiveUniverse} onBack={() => handleNav('home')} />} />
  <Route path="/daily-performance-lab" element={<Navigate to="/daily-performance" replace />} />
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
              handleNav(`bulletin/${effectiveUniverse}`);
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

      {/* PWA Domain Migration & Auto-Update Modal */}
      <PwaMigrationModal />

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

      {/* Floating Google Gemini AI Assistant Button */}
      <FloatingGeminiButton
        isCrewRole={isCrewRole}
        isBulletin={isBulletin}
        isBulletinFocusMode={bulletinFocusMode}
        currentPath={location.pathname}
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
