import React, { useState, useEffect } from 'react';
import { Bell, BellRing, X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { 
  subscribeUserToPush, 
  autoSubscribeIfPermitted, 
  isPwaInstalled, 
  isMobileDevice, 
  registerServiceWorker 
} from '../push-notifications';

interface PushNotificationPromptProps {
  userNik?: string | null;
  userName?: string | null;
}

export function PushNotificationPrompt({ userNik, userName }: PushNotificationPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Pastikan service worker terdaftar
    registerServiceWorker();

    if (!userNik) return;

    // Jika izin sudah diberikan sebelumnya, otomatis hubungkan langganan push HP ke NIK pengguna di background
    if ('Notification' in window && Notification.permission === 'granted') {
      autoSubscribeIfPermitted(userNik);
      return;
    }

    // Jika izin masih default dan aplikasi terpasang di HP (PWA standalone) atau dibuka di HP
    const isMobile = isMobileDevice();
    const isStandalone = isPwaInstalled();
    const isDismissed = sessionStorage.getItem('p2h_push_prompt_dismissed') === '1';

    if ('Notification' in window && Notification.permission === 'default' && (isMobile || isStandalone) && !isDismissed) {
      // Tampilkan banner setelah sedikit delay agar halaman stabil
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [userNik]);

  // Dengarkan saat user baru saja menginstall PWA di HP
  useEffect(() => {
    const handleAppInstalled = () => {
      console.log('[PWA] App was successfully installed on device');
      sessionStorage.removeItem('p2h_push_prompt_dismissed');
      if (userNik && 'Notification' in window && Notification.permission === 'default') {
        setShowPrompt(true);
      }
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    return () => window.removeEventListener('appinstalled', handleAppInstalled);
  }, [userNik]);

  const handleActivate = async () => {
    if (!userNik) {
      toast.error('Silakan login terlebih dahulu untuk mengaktifkan notifikasi.');
      return;
    }

    setIsSubscribing(true);
    try {
      const success = await subscribeUserToPush(userNik, false);
      if (success) {
        toast.success('Notifikasi HP Berhasil Diaktifkan!', {
          description: 'Anda akan menerima pemberitahuan langsung saat ada temuan inspeksi K3, APD, atau tiket baru.',
          icon: '🔔'
        });
        setShowPrompt(false);
      } else {
        if ('Notification' in window && Notification.permission === 'denied') {
          toast.error('Izin notifikasi diblokir di peramban.', {
            description: 'Aktifkan izin notifikasi melalui pengaturan situs di peramban/HP Anda.'
          });
        }
      }
    } catch (err: any) {
      console.error('Error activating push:', err);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('p2h_push_prompt_dismissed', '1');
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:w-96 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div 
        className="rounded-2xl p-4 shadow-2xl border backdrop-blur-md flex flex-col gap-3 relative overflow-hidden"
        style={{
          backgroundColor: 'var(--card-bg, #FFFFFF)',
          borderColor: 'var(--border-main, #E2E8F0)',
          color: 'var(--text-main, #1E293B)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
        }}
      >
        <button
          onClick={handleDismiss}
          className="absolute top-2.5 right-2.5 p-1 rounded-full opacity-60 hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
            style={{
              backgroundColor: 'rgba(42, 157, 143, 0.15)',
              color: 'var(--primary, #2A9D8F)'
            }}
          >
            <BellRing className="w-5 h-5 animate-bounce" />
          </div>

          <div className="flex-1">
            <h4 className="font-bold text-sm leading-snug">
              Aktifkan Notifikasi di HP
            </h4>
            <p className="text-xs mt-1 leading-relaxed opacity-80" style={{ color: 'var(--text-muted)' }}>
              Dapatkan pemberitahuan seketika saat ada <strong>temuan inspeksi K3</strong>, <strong>ketidakpatuhan APD</strong>, dan <strong>tiket tindak lanjut</strong> langsung di layar HP Anda.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-dashed" style={{ borderColor: 'var(--border-main, #E2E8F0)' }}>
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg opacity-70 hover:opacity-100 cursor-pointer transition-colors"
          >
            Nanti Saja
          </button>
          <button
            onClick={handleActivate}
            disabled={isSubscribing}
            className="px-4 py-1.5 text-xs font-bold text-white rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--primary, #2A9D8F)' }}
          >
            {isSubscribing ? (
              <span>Mengaktifkan...</span>
            ) : (
              <>
                <Bell className="w-3.5 h-3.5" /> Aktifkan di HP
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
