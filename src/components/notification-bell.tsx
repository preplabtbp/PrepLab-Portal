import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, BellRing, Wrench, ChevronRight, Megaphone, ClipboardCheck, Download } from 'lucide-react';
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

  const isDev = userNik === '02D25000055' || userNik === '02D24000043' || userNik === 'preplabadmin';
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
    } else if (notif.link === '/chat' || notif.title?.includes('Chat') || notif.title?.includes('menyebut Anda')) {
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

            {/* List Notifications */}
            <div className="overflow-y-auto flex-1 p-2 space-y-1.5">
              {filteredNotifs.length === 0 ? (
                <div className="text-center py-8 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  Belum ada notifikasi
                </div>
              ) : (
                filteredNotifs.map((notif) => {
                  const isWO = isWoNotification(notif);
                  const isP5M = isP5mNotification(notif);
                  const isInspection = isInspectionCompletedNotification(notif);
                  return (
                    <div 
                      key={notif.id} 
                      className={`p-3 rounded-xl text-xs relative cursor-pointer border transition-all hover:scale-[1.01] ${
                        notif.isRead ? 'opacity-70' : 'shadow-xs font-medium'
                      }`}
                      style={{
                        backgroundColor: notif.isRead ? 'var(--card-bg)' : 'var(--input-bg)',
                        borderColor: isP5M && !notif.isRead ? 'rgba(245, 158, 11, 0.4)' : (isInspection && !notif.isRead ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-main)')
                      }}
                      onClick={() => handleNotificationClick(notif)}
                    >
                      {!notif.isRead && (
                        <div 
                          className="absolute top-3.5 right-3 w-2 h-2 rounded-full"
                          style={{ backgroundColor: isP5M ? '#F59E0B' : (isInspection ? '#10B981' : 'var(--primary, #2A9D8F)') }}
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
                })
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