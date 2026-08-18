const fs = require('fs');
let code = fs.readFileSync('src/components/notification-bell.tsx', 'utf8');

const replacement = `import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { format } from 'date-fns';

export function NotificationBell({ userNik }: { userNik?: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('Semua');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const isDev = userNik === '02D25000055' || userNik === 'preplabadmin';

  const fetchNotifications = async () => {
    if (!userNik) return;
    try {
      const res = await fetch(\`/api/notifications?userId=\${userNik}\`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: any) => !n.isRead).length);
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
      await fetch(\`/api/notifications/\${id}/read\`, { method: 'PUT' });
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    if (!userNik) return;
    try {
      await fetch(\`/api/notifications/read-all?userId=\${userNik}\`, { method: 'PUT' });
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredNotifs = notifications.filter(n => {
    if (activeTab === 'Semua') return true;
    if (activeTab === 'Maintenance') return n.role === 'Maintenance';
    if (activeTab === 'Administration') return n.role === 'Administration' || n.role === 'admin';
    if (activeTab === 'Sistem') return !n.role || (n.role !== 'Maintenance' && n.role !== 'Administration' && n.role !== 'admin');
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
                {['Semua', 'Maintenance', 'Administration', 'Sistem'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={\`px-2 py-1 whitespace-nowrap text-[10px] font-medium rounded-full transition-colors \${activeTab === tab ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}\`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {filteredNotifs.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-sm">
                No notifications yet
              </div>
            ) : (
              filteredNotifs.map((notif) => (
                <div 
                  key={notif.id} 
                  className={\`p-3 rounded-lg text-sm relative \${notif.isRead ? 'bg-white opacity-70' : 'bg-blue-50/50'}\`}
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
}`;

fs.writeFileSync('src/components/notification-bell.tsx', replacement);
console.log("Patched NotificationBell");
