import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Bell, Check, X, BellRing, Wrench, ChevronRight, Megaphone, ClipboardCheck, Download, Pin, Newspaper, BookOpen, Calendar, ChevronDown, CheckSquare, Layers, Trophy, MessageSquare, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { subscribeUserToPush } from '../push-notifications';
import { WorkOrderDetailModal } from './WorkOrderDetailModal';
import { io } from 'socket.io-client';

interface NotificationBellProps {
  userNik?: string;
  userName?: string;
  onOpenP5mModal?: (notif?: any) => void;
}

export function NotificationBell({ userNik, userName, onOpenP5mModal }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('Semua');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // WO Detail Modal states
  const [selectedWoId, setSelectedWoId] = useState<string | null>(null);
  const [showWoModal, setShowWoModal] = useState(false);

  const isDev = userNik === '02D25000055' || userNik === '02D24000043' || userNik === 'M0403240177' || userNik === 'preplabadmin';
  const userJabatan = (() => {
    try {
      const p = JSON.parse(localStorage.getItem('p2h_inspector_profile') || '{}');
      return (p.jabatan || localStorage.getItem('p2h_inspector_jabatan') || '').toLowerCase();
    } catch {
      return (localStorage.getItem('p2h_inspector_jabatan') || '').toLowerCase();
    }
  })();
  const isSpvUp = isDev || 
    userJabatan.includes('supervisor') || 
    userJabatan.includes('superintendent') || 
    userJabatan.includes('manager') || 
    userJabatan.includes('lead') || 
    userJabatan.includes('admin') ||
    userJabatan.includes('foreman');

  const [pushStatus, setPushStatus] = useState<string>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPushStatus(Notification.permission);
    }
  }, []);

  const handleSubscribe = async () => {
    if (!userNik) return;
    const success = await subscribeUserToPush(userNik);
    if (success) {
      setPushStatus('granted');
      toast.success('Notifikasi push HP berhasil diaktifkan!');
    } else {
      if ('Notification' in window) {
        setPushStatus(Notification.permission);
      }
      toast.error('Gagal mengaktifkan notifikasi push. Periksa izin peramban/HP.');
    }
  };

  const fetchNotifications = async () => {
    if (!userNik) return;
    try {
      const res = await fetch(`/api/notifications?userId=${userNik}`);
      if (res.ok) {
        const data = await res.json();
        
        // --- Implementasi Local Storage untuk status "dibaca" ---
        const readAllTime = Number(localStorage.getItem(`notif_read_all_${userNik}`)) || 0;
        const readIds = JSON.parse(localStorage.getItem(`notif_read_ids_${userNik}`) || '[]');
        
        const processedData = data.map((n: any) => {
          const notifTime = n.createdAt ? new Date(n.createdAt).getTime() : 0;
          const isLocallyRead = readIds.includes(n.id) || (notifTime <= readAllTime && notifTime > 0);
          return { ...n, isRead: n.isRead || isLocallyRead };
        });

        setNotifications(processedData);
        setUnreadCount(processedData.filter((n: any) => !n.isRead).length);
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn("Could not fetch notifications");
      }
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [userNik]);

  // Real-time Socket.IO listener for instant notification delivery
  useEffect(() => {
    if (!userNik) return;
    const socket = io();

    socket.on('notification:new', (notif: any) => {
      if (!notif) return;
      // Determine if relevant to this user
      const isPersonal = notif.userId && notif.userId === userNik;
      const isBroadcast = !notif.userId;
      const isRoleMatch = notif.role && (
        userJabatan.includes(notif.role.toLowerCase()) || 
        isDev || 
        isSpvUp
      );

      if (isPersonal || isBroadcast || isRoleMatch) {
        // Play soft chime sound
        try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioContext();
          if (ctx.state === 'suspended') ctx.resume();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523.25, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.1);
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.4);
        } catch (e) {}

        // Show toast with action button
        toast(notif.title || 'Notifikasi Baru', {
          description: notif.message,
          icon: '🔔',
          duration: 5000,
          action: {
            label: 'Buka',
            onClick: () => handleNotificationClick(notif)
          }
        });

        // Inform other modal listeners (e.g. ReminderNotificationModal)
        window.dispatchEvent(new CustomEvent('notification_received', { detail: notif }));

        // Immediate fetch
        fetchNotifications();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [userNik, userJabatan, isDev, isSpvUp]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: number) => {
    try {
      const readIds = JSON.parse(localStorage.getItem(`notif_read_ids_${userNik}`) || '[]');
      if (!readIds.includes(id)) {
        readIds.push(id);
        localStorage.setItem(`notif_read_ids_${userNik}`, JSON.stringify(readIds));
      }
      
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(Math.max(0, unreadCount - 1));
      
      fetch(`/api/notifications/${id}/read`, { method: 'PUT' }).catch(console.error);
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    if (!userNik) return;
    try {
      const maxTime = notifications.length > 0 
        ? Math.max(...notifications.map(n => n.createdAt ? new Date(n.createdAt).getTime() : 0))
        : Date.now();
      
      localStorage.setItem(`notif_read_all_${userNik}`, maxTime.toString());
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      
      fetch(`/api/notifications/read-all?userId=${userNik}`, { method: 'PUT' }).catch(console.error);
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to extract WO ID from notification
  const extractWoId = (notif: any): string | null => {
    const str = `${notif.title || ''} ${notif.message || ''} ${notif.link || ''}`;
    const match = str.match(/FWO-[\w-]+/) || str.match(/WO-[\w-]+/);
    if (match) return match[0];
    
    if (notif.link && notif.link.includes('/wo-')) {
      const parts = notif.link.split('/');
      return parts[parts.length - 1];
    }
    return null;
  };

  const isWoNotification = (notif: any): boolean => {
    const title = (notif.title || '').toLowerCase();
    const message = (notif.message || '').toLowerCase();
    const role = (notif.role || '').toLowerCase();
    return (
      title.includes('work order') || 
      title.includes('wo ') || 
      message.includes('buat wo') || 
      message.includes('fwo-') ||
      role === 'maintenance' ||
      !!extractWoId(notif)
    );
  };

  const isP5mNotification = (notif: any): boolean => {
    const title = (notif.title || '').toLowerCase();
    const message = (notif.message || '').toLowerCase();
    const link = (notif.link || '').toLowerCase();
    return (
      title.includes('p5m') || 
      message.includes('p5m') || 
      link.includes('p5m') ||
      title.includes('pembawa materi') ||
      message.includes('pembawa materi') ||
      title.includes('briefing alert')
    );
  };

  const isInspectionCompletedNotification = (notif: any): boolean => {
    const type = (notif.type || '').toUpperCase();
    const title = (notif.title || '').toLowerCase();
    return (
      type === 'INSPECTION_COMPLETED' ||
      title.includes('inspeksi selesai')
    );
  };

  const isBulletinNotification = (notif: any): boolean => {
    const link = (notif.link || '').toLowerCase();
    const title = (notif.title || '').toLowerCase();
    const msg = (notif.message || '').toLowerCase();
    return (
      link.includes('/bulletin') ||
      title.includes('buletin') ||
      title.includes('artikel') ||
      title.includes('komentar') ||
      msg.includes('buletin') ||
      msg.includes('artikel buletin')
    );
  };

  const isLogbookNotification = (notif: any): boolean => {
    const link = (notif.link || '').toLowerCase();
    const title = (notif.title || '').toLowerCase();
    const msg = (notif.message || '').toLowerCase();
    return (
      link.includes('/logbook') ||
      title.includes('log book') ||
      title.includes('tugas') ||
      title.includes('draft perubahan') ||
      msg.includes('logbook') ||
      msg.includes('penugasan')
    );
  };

  const isAgendaNotification = (notif: any): boolean => {
    const link = (notif.link || '').toLowerCase();
    const title = (notif.title || '').toLowerCase();
    return link.includes('/agenda') || title.includes('agenda');
  };

  const isSafetyK3Notification = (notif: any): boolean => {
    const type = (notif.type || '').toUpperCase();
    const title = (notif.title || '').toLowerCase();
    const msg = (notif.message || '').toLowerCase();
    const link = (notif.link || '').toLowerCase();
    return (
      type === 'INSPECTION_COMPLETED' ||
      type === 'REMINDER_INSPECTION' ||
      type === 'REMINDER_KTA' ||
      isP5mNotification(notif) ||
      isInspectionCompletedNotification(notif) ||
      title.includes('inspeksi') ||
      title.includes('p2h') ||
      title.includes('temuan') ||
      title.includes('apd') ||
      title.includes('kta') ||
      title.includes('tta') ||
      title.includes('pengingat') ||
      link.includes('/ticket') ||
      link.includes('/inspections') ||
      msg.includes('inspeksi') ||
      msg.includes('kta') ||
      msg.includes('tta')
    );
  };

  const isLogbookOpsNotification = (notif: any): boolean => {
    return isLogbookNotification(notif) || isBulletinNotification(notif) || isAgendaNotification(notif);
  };

  const isGamificationNotification = (notif: any): boolean => {
    const link = (notif.link || '').toLowerCase();
    const title = (notif.title || '').toLowerCase();
    const msg = (notif.message || '').toLowerCase();
    const type = (notif.type || '').toUpperCase();
    return (
      link.includes('/leaderboard') ||
      link.includes('gamification') ||
      type === 'RANK_PROMOTION' ||
      type === 'ACHIEVEMENT_UNLOCKED' ||
      title.includes('exp') ||
      title.includes('pangkat') ||
      title.includes('leaderboard') ||
      title.includes('achievement') ||
      title.includes('gelar') ||
      title.includes('penghormatan tertinggi') ||
      msg.includes('exp') ||
      msg.includes('pangkat') ||
      msg.includes('leaderboard')
    );
  };

  const isChatNotification = (notif: any): boolean => {
    const link = (notif.link || '').toLowerCase();
    const title = (notif.title || '').toLowerCase();
    const msg = (notif.message || '').toLowerCase();
    return (
      link.includes('/chat') ||
      title.includes('chat') ||
      title.includes('pesan baru') ||
      title.includes('obrolan') ||
      title.includes('menyebut anda') ||
      msg.includes('obrolan') ||
      msg.includes('mengirim pesan') ||
      title.includes('hq vanguard command')
    );
  };

  const handleNotificationClick = (notif: any) => {
    if (!notif.isRead) {
      markAsRead(notif.id);
    }

    const woId = extractWoId(notif);
    if (woId) {
      setSelectedWoId(woId);
      setShowWoModal(true);
      setIsOpen(false);
    } else if (isWoNotification(notif)) {
      setSelectedWoId('LATEST_OPEN_WO');
      setShowWoModal(true);
      setIsOpen(false);
    } else if (isP5mNotification(notif)) {
      setIsOpen(false);
      if (onOpenP5mModal) {
        onOpenP5mModal(notif);
      }
      // Broadcast event so P5MNotificationModal opens even if acknowledged / skipped previously
      window.dispatchEvent(new CustomEvent('open-p5m-modal', {
        detail: {
          notif,
          userNik,
          userName
        }
      }));
    } else if (isInspectionCompletedNotification(notif)) {
      setIsOpen(false);
      try {
        let payload: any = {};
        if (typeof notif.link === 'string' && notif.link.startsWith('{')) {
          payload = JSON.parse(notif.link);
        } else {
          payload = {
            pdfUrl: notif.link,
            formTitle: notif.title,
            waMessageText: notif.message
          };
        }
        window.dispatchEvent(new CustomEvent('open-inspection-completion-modal', {
          detail: payload
        }));
      } catch (err) {
        console.error('Failed to parse inspection completion notif:', err);
      }
    } else if (isGamificationNotification(notif)) {
      setIsOpen(false);
      window.dispatchEvent(new CustomEvent('navigate-tab', { detail: { tab: 'leaderboard' } }));
    } else if (isChatNotification(notif)) {
      setIsOpen(false);
      window.dispatchEvent(new CustomEvent('open-chat-drawer'));
    } else if (notif.link?.startsWith('/bulletin')) {
      setIsOpen(false);
      window.dispatchEvent(new CustomEvent('navigate-bulletin', { detail: { link: notif.link } }));
    } else if (notif.link?.startsWith('/agenda') || notif.title?.toLowerCase().includes('agenda')) {
      setIsOpen(false);
      window.dispatchEvent(new CustomEvent('navigate-agenda', { detail: { link: notif.link || '/agenda' } }));
    } else if (notif.link) {
      setIsOpen(false);
      if (notif.link.startsWith('/')) {
        window.location.href = notif.link;
      }
    }
  };

  const filteredNotifs = notifications.filter(n => {
    if (activeTab === 'Semua') return true;
    if (activeTab === 'Maintenance') return n.role === 'Maintenance';
    if (activeTab === 'Administration') return n.role === 'Administration' || n.role === 'admin';
    if (activeTab === 'Laboratory') return n.role === 'Laboratory';
    if (activeTab === 'Preparation') return n.role === 'Preparation';
    if (activeTab === 'QA') return n.role === 'QA';
    if (activeTab === 'Inventory Control') return n.role === 'Inventory Control';
    if (activeTab === 'Sistem') return !n.role || (!['Maintenance', 'Administration', 'admin', 'Laboratory', 'Preparation', 'QA', 'Inventory Control'].includes(n.role));
    return true;
  });

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Group notifications into 5 pinned category summaries with pop counters
  const { pinnedCategories, generalNotifs } = useMemo(() => {
    const groups: {
      id: string;
      title: string;
      badgeText: string;
      colorClass: string;
      bgClass: string;
      borderClass: string;
      icon: any;
      items: any[];
      unreadCount: number;
    }[] = [
      {
        id: 'wo',
        title: 'Work Orders & Pemeliharaan',
        badgeText: 'WO',
        colorClass: 'text-sky-600 dark:text-sky-400',
        bgClass: 'bg-sky-500/10',
        borderClass: 'border-sky-500/30',
        icon: Wrench,
        items: [],
        unreadCount: 0
      },
      {
        id: 'safety_k3',
        title: 'Keselamatan Kerja (K3) & Inspeksi',
        badgeText: 'K3 & Safety',
        colorClass: 'text-emerald-600 dark:text-emerald-400',
        bgClass: 'bg-emerald-500/10',
        borderClass: 'border-emerald-500/30',
        icon: ShieldAlert,
        items: [],
        unreadCount: 0
      },
      {
        id: 'logbook_ops',
        title: 'Logbook, Buletin & Agenda',
        badgeText: 'Operasional',
        colorClass: 'text-indigo-600 dark:text-indigo-400',
        bgClass: 'bg-indigo-500/10',
        borderClass: 'border-indigo-500/30',
        icon: BookOpen,
        items: [],
        unreadCount: 0
      },
      {
        id: 'gamification',
        title: 'Leaderboard, EXP & Pangkat',
        badgeText: 'Rank & EXP',
        colorClass: 'text-amber-600 dark:text-amber-400',
        bgClass: 'bg-amber-500/10',
        borderClass: 'border-amber-500/30',
        icon: Trophy,
        items: [],
        unreadCount: 0
      },
      {
        id: 'chat',
        title: 'Chat & Pesan Komunikasi',
        badgeText: 'Chat',
        colorClass: 'text-rose-600 dark:text-rose-400',
        bgClass: 'bg-rose-500/10',
        borderClass: 'border-rose-500/30',
        icon: MessageSquare,
        items: [],
        unreadCount: 0
      }
    ];

    const general: any[] = [];

    filteredNotifs.forEach((n) => {
      if (isChatNotification(n)) {
        groups[4].items.push(n);
        if (!n.isRead) groups[4].unreadCount++;
      } else if (isGamificationNotification(n)) {
        groups[3].items.push(n);
        if (!n.isRead) groups[3].unreadCount++;
      } else if (isWoNotification(n)) {
        groups[0].items.push(n);
        if (!n.isRead) groups[0].unreadCount++;
      } else if (isSafetyK3Notification(n)) {
        groups[1].items.push(n);
        if (!n.isRead) groups[1].unreadCount++;
      } else if (isLogbookOpsNotification(n)) {
        groups[2].items.push(n);
        if (!n.isRead) groups[2].unreadCount++;
      } else {
        general.push(n);
      }
    });

    return {
      pinnedCategories: groups.filter(g => g.items.length > 0),
      generalNotifs: general
    };
  }, [filteredNotifs]);

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-8 h-8 rounded-full border flex items-center justify-center shadow-xs active:scale-95 transition-transform relative cursor-pointer"
          style={{
            backgroundColor: 'var(--input-bg, #FFFFFF)',
            borderColor: 'var(--border-main, #E2E8F0)',
            color: 'var(--text-main, #1E293B)'
          }}
          title="Notifikasi"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span 
              className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-xs ring-2 ring-white"
              style={{ backgroundColor: 'var(--bubble-color, #EF4444)' }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        
        {isOpen && (
          <div 
            className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-2xl border overflow-hidden z-50 flex flex-col max-h-[500px] animate-in fade-in zoom-in-95 duration-150"
            style={{
              backgroundColor: 'var(--card-bg, #FFFFFF)',
              borderColor: 'var(--border-main, #E2E8F0)',
              color: 'var(--text-main, #1E293B)'
            }}
          >
            {/* Header Dropdown */}
            <div 
              className="p-3.5 border-b flex flex-col gap-2 select-none"
              style={{
                backgroundColor: 'var(--bg-main, #F8FAFC)',
                borderColor: 'var(--border-main, #E2E8F0)'
              }}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-teal-500" />
                  <h3 className="font-bold text-sm font-display" style={{ color: 'var(--text-main)' }}>
                    Notifikasi Portal
                  </h3>
                </div>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllAsRead}
                    className="text-xs font-semibold hover:opacity-80 flex items-center gap-1 cursor-pointer"
                    style={{ color: 'var(--primary, #2A9D8F)' }}
                  >
                    <Check className="w-3.5 h-3.5" /> Tandai semua dibaca
                  </button>
                )}
              </div>

              {(isDev || isSpvUp) && (
                <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                  {['Semua', 'Maintenance', 'Laboratory', 'Preparation', 'QA', 'Inventory Control', 'Administration', 'Sistem'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-2.5 py-0.5 whitespace-nowrap text-[10px] font-bold rounded-full transition-colors cursor-pointer border ${
                        activeTab === tab 
                          ? 'text-white' 
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: activeTab === tab ? 'var(--primary)' : 'var(--input-bg)',
                        borderColor: 'var(--border-main)',
                        color: activeTab === tab ? '#FFFFFF' : 'var(--text-main)'
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {pushStatus !== 'granted' && (
              <div 
                className="mx-3 my-2 p-2.5 rounded-xl border flex items-center justify-between shadow-2xs"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--border-main)'
                }}
              >
                <span className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
                  Aktifkan Notifikasi Push
                </span>
                <button 
                  onClick={handleSubscribe} 
                  className="px-2.5 py-1 text-white text-[10px] font-bold rounded-lg cursor-pointer"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  Aktifkan
                </button>
              </div>
            )}

            {/* List Notifications with Pinned Categories */}
            <div className="overflow-y-auto flex-1 p-2 space-y-2">
              {/* PINNED CATEGORY SUMMARY CARDS (1x Card Rekap per Kategori dengan Pop Angka) */}
              {pinnedCategories.length > 0 && (
                <div className="space-y-1.5 pb-1">
                  <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Pin className="w-3 h-3 text-amber-500" />
                    <span>Rekap Notifikasi Ter-Pin</span>
                  </div>

                  {pinnedCategories.map((cat) => {
                    const IconComponent = cat.icon;
                    const isExpanded = expandedCategory === cat.id;
                    const latestItem = cat.items[0];

                    return (
                      <div
                        key={cat.id}
                        className={`rounded-xl border transition-all ${
                          cat.unreadCount > 0
                            ? 'bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent border-teal-500/40 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                        style={{ backgroundColor: cat.unreadCount === 0 ? 'var(--card-bg)' : undefined }}
                      >
                        {/* Pinned Category Header Clickable */}
                        <div
                          onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                          className="p-2.5 flex items-center justify-between gap-2 cursor-pointer hover:opacity-90 select-none"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-7 h-7 rounded-lg ${cat.bgClass} ${cat.colorClass} flex items-center justify-center shrink-0`}>
                              <IconComponent className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs truncate" style={{ color: 'var(--text-main)' }}>
                                  {cat.title}
                                </span>
                              </div>
                              <p className="text-[11px] truncate opacity-70" style={{ color: 'var(--text-muted)' }}>
                                {latestItem?.title || latestItem?.message || `${cat.items.length} aktivitas terdata`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* POP ANGKA COUNTER */}
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide shadow-xs ${
                              cat.unreadCount > 0 
                                ? 'bg-rose-500 text-white animate-pulse ring-2 ring-rose-300' 
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}>
                              {cat.unreadCount > 0 ? `${cat.unreadCount} BARU` : `${cat.items.length}`}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-teal-600' : ''}`} />
                          </div>
                        </div>

                        {/* Expanded Items List inside Pinned Category */}
                        {isExpanded && (
                          <div className="px-2 pb-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5 animate-in fade-in duration-150">
                            {cat.items.map((notif) => {
                              const isWO = isWoNotification(notif);
                              const isP5M = isP5mNotification(notif);
                              const isInspection = isInspectionCompletedNotification(notif);

                              return (
                                <div
                                  key={notif.id}
                                  onClick={() => handleNotificationClick(notif)}
                                  className={`p-2 rounded-lg text-xs cursor-pointer border transition-all hover:scale-[1.01] ${
                                    notif.isRead ? 'opacity-70' : 'font-medium bg-white dark:bg-slate-800 shadow-2xs'
                                  }`}
                                  style={{
                                    borderColor: 'var(--border-main)'
                                  }}
                                >
                                  <div className="flex items-center justify-between gap-1 mb-0.5">
                                    <h5 className="font-bold text-xs truncate flex-1" style={{ color: 'var(--text-main)' }}>
                                      {notif.title}
                                    </h5>
                                    {!notif.isRead && (
                                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                                    {notif.message}
                                  </p>
                                  <div className="mt-1 flex items-center justify-between text-[9px] font-mono opacity-60" style={{ color: 'var(--text-muted)' }}>
                                    <span>{notif.createdAt ? format(new Date(notif.createdAt), 'dd MMM HH:mm') : 'Baru saja'}</span>
                                    <span className="text-teal-600 font-bold hover:underline">Buka rincian →</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* UNASSIGNED / GENERAL NOTIFICATIONS (Non-kategori) */}
              {generalNotifs.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Notifikasi Umum & Sistem
                  </div>
                  {generalNotifs.map((notif) => {
                    const isWO = isWoNotification(notif);
                    const isP5M = isP5mNotification(notif);
                    const isInspection = isInspectionCompletedNotification(notif);
                    const isGame = isGamificationNotification(notif);
                    const isChat = isChatNotification(notif);
                    return (
                      <div 
                        key={notif.id} 
                        className={`p-3 rounded-xl text-xs relative cursor-pointer border transition-all hover:scale-[1.01] ${
                          notif.isRead ? 'opacity-70' : 'shadow-xs font-medium'
                        }`}
                        style={{
                          backgroundColor: notif.isRead ? 'var(--card-bg)' : 'var(--input-bg)',
                          borderColor: 'var(--border-main)'
                        }}
                        onClick={() => handleNotificationClick(notif)}
                      >
                      {!notif.isRead && (
                        <div 
                          className="absolute top-3.5 right-3 w-2 h-2 rounded-full"
                          style={{ 
                            backgroundColor: isP5M ? '#F59E0B' : (isInspection ? '#10B981' : (isGame ? '#D97706' : (isChat ? '#E11D48' : 'var(--primary, #2A9D8F)'))) 
                          }}
                        />
                      )}
                      
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {isWO && (
                          <span 
                            className="p-1 rounded-md text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs"
                            style={{ 
                              backgroundColor: 'rgba(42, 157, 143, 0.15)',
                              color: 'var(--primary, #2A9D8F)' 
                            }}
                          >
                            <Wrench className="w-3 h-3" /> WO
                          </span>
                        )}
                        {isP5M && (
                          <span 
                            className="p-1 rounded-md text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          >
                            <Megaphone className="w-3 h-3" /> P5M
                          </span>
                        )}
                        {isInspection && (
                          <span 
                            className="p-1 rounded-md text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          >
                            <ClipboardCheck className="w-3 h-3" /> Selesai
                          </span>
                        )}
                        {isGame && (
                          <span 
                            className="p-1 rounded-md text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          >
                            <Trophy className="w-3 h-3" /> Rank & EXP
                          </span>
                        )}
                        {isChat && (
                          <span 
                            className="p-1 rounded-md text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                          >
                            <MessageSquare className="w-3 h-3" /> Chat
                          </span>
                        )}
                        <h4 className="font-bold text-xs truncate pr-3" style={{ color: 'var(--text-main)' }}>
                          {notif.title}
                        </h4>
                      </div>

                      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                        {notif.message}
                      </p>

                      {isWO && (
                        <div 
                          className="mt-2 pt-1.5 border-t flex items-center justify-between text-[11px] font-bold"
                          style={{ borderColor: 'var(--border-main)', color: 'var(--primary, #2A9D8F)' }}
                        >
                          <span className="flex items-center gap-1">
                            <Wrench className="w-3 h-3" /> {isSpvUp ? 'Lihat Detail Work Order Section' : 'Buka Detail & Selesaikan WO'}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      )}

                      {isP5M && (
                        <div 
                          className="mt-2 pt-1.5 border-t flex items-center justify-between text-[11px] font-bold border-amber-500/20 text-amber-600 dark:text-amber-400"
                        >
                          <span className="flex items-center gap-1">
                            <Megaphone className="w-3 h-3" /> Buka Pemberitahuan &amp; Unduh Materi P5M
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-amber-500" />
                        </div>
                      )}

                      {isInspection && (
                        <div 
                          className="mt-2 pt-1.5 border-t flex items-center justify-between text-[11px] font-bold border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        >
                          <span className="flex items-center gap-1">
                            <Download className="w-3 h-3" /> Unduh PDF &amp; General Submit Safety
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-emerald-500" />
                        </div>
                      )}

                      {isGame && (
                        <div 
                          className="mt-2 pt-1.5 border-t flex items-center justify-between text-[11px] font-bold border-amber-500/20 text-amber-600 dark:text-amber-400"
                        >
                          <span className="flex items-center gap-1">
                            <Trophy className="w-3 h-3" /> Buka Hall of Fame &amp; Peringkat
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-amber-500" />
                        </div>
                      )}

                      {isChat && (
                        <div 
                          className="mt-2 pt-1.5 border-t flex items-center justify-between text-[11px] font-bold border-rose-500/20 text-rose-600 dark:text-rose-400"
                        >
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> Buka Ruang Obrolan
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-rose-500" />
                        </div>
                      )}

                      <div className="text-[10px] opacity-60 font-mono mt-1.5 flex justify-between items-center" style={{ color: 'var(--text-muted)' }}>
                        <span>{notif.createdAt ? format(new Date(notif.createdAt), 'dd MMM HH:mm') : 'Baru saja'}</span>
                        {notif.role && (
                          <span 
                            className="uppercase text-[9px] font-bold px-1.5 py-0.5 rounded border"
                            style={{ 
                              backgroundColor: 'var(--input-bg)',
                              borderColor: 'var(--border-main)'
                            }}
                          >
                            {notif.role}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

              {pinnedCategories.length === 0 && generalNotifs.length === 0 && (
                <div className="text-center py-8 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  Belum ada notifikasi
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* WORK ORDER DETAIL & RESOLUTION MODAL */}
      <WorkOrderDetailModal 
        woId={selectedWoId}
        isOpen={showWoModal}
        onClose={() => {
          setShowWoModal(false);
          setSelectedWoId(null);
        }}
        inspectorName={userName}
        inspectorNik={userNik}
        onResolved={() => {
          fetchNotifications();
        }}
      />
    </>
  );
}