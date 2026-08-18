import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, BellRing } from 'lucide-react';
import { format } from 'date-fns';
import { subscribeUserToPush } from '../push-notifications';

export function NotificationBell({ userNik }: { userNik?: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('Semua');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const isDev = userNik === '02D25000055' || userNik === 'preplabadmin';

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
      alert('Push notifications enabled!');
    } else {
      alert('Failed to enable push notifications. Check browser settings.');
      if ('Notification' in window) {
        setPushStatus(Notification.permission);
      }
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
      // Simpan di local storage
      const readIds = JSON.parse(localStorage.getItem(`notif_read_ids_${userNik}`) || '[]');
      if (!readIds.includes(id)) {
        readIds.push(id);
        localStorage.setItem(`notif_read_ids_${userNik}`, JSON.stringify(readIds));
      }
      
      // Update UI langsung
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(Math.max(0, unreadCount - 1));
      
      // Hit API di background
      fetch(`/api/notifications/${id}/read`, { method: 'PUT' }).catch(console.error);
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    if (!userNik) return;
    try {
      // Cari timestamp paling baru dari notifikasi yang ada untuk mencegah bug zona waktu/jam lokal
      const maxTime = notifications.length > 0 
        ? Math.max(...notifications.map(n => n.createdAt ? new Date(n.createdAt).getTime() : 0))
        : Date.now();
      
      // Simpan timestamp di local storage
      localStorage.setItem(`notif_read_all_${userNik}`, maxTime.toString());
      // Update UI langsung
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      
      // Hit API di background (opsional, untuk notif personal)
      fetch(`/api/notifications/read-all?userId=${userNik}`, { method: 'PUT' }).catch(console.error);
    } catch (err) {
      console.error(err);
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
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm text-slate-600 active:scale-95 transition-transform relative"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50 flex flex-col max-h-[450px]">
          <div className="p-3 border-b border-slate-100 flex flex-col gap-2 bg-slate-50">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Mark all read
                </button>
              )}
            </div>
            {isDev && (
              <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
                {['Semua', 'Laboratory', 'Preparation', 'QA', 'Inventory Control', 'Maintenance', 'Administration', 'Sistem'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-2 py-1 whitespace-nowrap text-[10px] font-medium rounded-full transition-colors ${activeTab === tab ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          
            {pushStatus !== 'granted' && (
              <div className="mx-2 mb-2 p-2 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between">
                <span className="text-xs text-blue-800">Aktifkan Notifikasi Push</span>
                <button onClick={handleSubscribe} className="px-2 py-1 bg-blue-600 text-white text-[10px] rounded hover:bg-blue-700">
                  Aktifkan
                </button>
              </div>
            )}
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {filteredNotifs.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-sm">
                No notifications yet
              </div>
            ) : (
              filteredNotifs.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-3 rounded-lg text-sm relative ${notif.isRead ? 'bg-white opacity-70' : 'bg-blue-50/50'}`}
                  onClick={() => {
                    if (!notif.isRead) markAsRead(notif.id);
                  }}
                >
                  {!notif.isRead && (
                    <div className="absolute top-4 right-3 w-2 h-2 rounded-full bg-blue-500"></div>
                  )}
                  <h4 className="font-medium text-slate-800 pr-4">{notif.title}</h4>
                  <p className="text-slate-600 text-xs mt-0.5 line-clamp-2">{notif.message}</p>
                  <p className="text-slate-400 text-[10px] mt-1 flex justify-between">
                    <span>{notif.createdAt ? format(new Date(notif.createdAt), 'dd MMM HH:mm') : 'Just now'}</span>
                    {isDev && notif.role && <span className="uppercase text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 rounded">{notif.role}</span>}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}