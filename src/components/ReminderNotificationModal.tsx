import React, { useState, useEffect } from 'react';
import { BellRing, CheckCircle2, ClipboardCheck, X, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from './ui';

interface ReminderNotificationModalProps {
  userNik?: string;
  onNavigateToInspection?: () => void;
}

export function ReminderNotificationModal({ userNik, onNavigateToInspection }: ReminderNotificationModalProps) {
  const [activeReminder, setActiveReminder] = useState<any | null>(null);

  const checkReminders = async () => {
    if (!userNik) return;
    try {
      const res = await fetch(`/api/notifications?userId=${userNik}`);
      if (res.ok) {
        const data = await res.json();
        // Find unread inspection reminder targeted specifically to this logged-in user
        const readIds = JSON.parse(localStorage.getItem(`notif_read_ids_${userNik}`) || '[]');
        const unreadReminder = Array.isArray(data) ? data.find((n: any) => 
          n.type === 'REMINDER_INSPECTION' && 
          (!n.userId || n.userId === userNik) &&
          !n.isRead && 
          !readIds.includes(n.id)
        ) : null;

        if (unreadReminder) {
          setActiveReminder(unreadReminder);
        } else {
          setActiveReminder(null);
        }
      }
    } catch (err) {
      // silent fetch fail
    }
  };

  useEffect(() => {
    checkReminders();
    const interval = setInterval(checkReminders, 10000);
    return () => clearInterval(interval);
  }, [userNik]);

  if (!activeReminder) return null;

  const handleDismiss = async (shouldNavigate = false) => {
    if (!activeReminder || !userNik) return;

    try {
      // Mark locally as read
      const readIds = JSON.parse(localStorage.getItem(`notif_read_ids_${userNik}`) || '[]');
      if (!readIds.includes(activeReminder.id)) {
        readIds.push(activeReminder.id);
        localStorage.setItem(`notif_read_ids_${userNik}`, JSON.stringify(readIds));
      }

      // Mark in DB as read
      fetch(`/api/notifications/${activeReminder.id}/read`, { method: 'PUT' }).catch(console.error);
    } catch (e) {
      console.error(e);
    }

    setActiveReminder(null);

    if (shouldNavigate && onNavigateToInspection) {
      onNavigateToInspection();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-[var(--card-bg, #ffffff)] border border-[var(--border-main, #e2e8f0)] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Glowing Top Banner */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          
          <div className="w-14 h-14 mx-auto mb-3 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-lg animate-bounce">
            <BellRing className="w-8 h-8 text-white" />
          </div>

          <h3 className="text-lg font-black tracking-tight flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-200" />
            PENGINGAT INSPEKSI TERPADU
          </h3>
          <p className="text-xs text-amber-100 mt-1 font-medium">
            Notifikasi Resmi Admin Safety & Lab PrepLab
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-center">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-sm font-semibold leading-relaxed">
            {activeReminder.message || 'Anda diingatkan untuk segera mengisi Laporan Inspeksi Terpadu Mingguan.'}
          </div>

          <p className="text-xs text-[var(--text-muted, #64748b)]">
            Mohon lakukan inspeksi area kerja Anda dan unggah laporan sebelum batas waktu periode minggu ini berakhir.
          </p>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col gap-2">
            <Button
              onClick={() => handleDismiss(true)}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm transition-all transform active:scale-95"
            >
              <ClipboardCheck className="w-4 h-4" />
              Isi Inspeksi Sekarang
            </Button>

            <button
              onClick={() => handleDismiss(false)}
              className="w-full py-2.5 text-xs text-[var(--text-muted, #64748b)] font-bold hover:text-[var(--text-main, #0f172a)] transition-colors flex items-center justify-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Tutup & Ingatkan Nanti
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
