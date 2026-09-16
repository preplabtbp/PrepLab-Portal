export const VAPID_PUBLIC_KEY = 'BIgHti1XLzsQJwoWj5T_KY9HyCMN-9KZBfdrBm_0fb1oyf9pTxafwUxdl3U-LIHBya3Jg3CsCtGbVdLadi_-5Hg';

export function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPwaInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (let reg of registrations) {
      const scriptURL = reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || '';
      if (scriptURL.includes('custom-sw')) {
        await reg.unregister();
      }
    }
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.warn('[SW] Registration failed:', err);
    return null;
  }
}

export async function autoSubscribeIfPermitted(nik: string): Promise<boolean> {
  if (!nik || typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return subscribeUserToPush(nik, true);
  }
  return false;
}

export async function subscribeUserToPush(nik: string, silent: boolean = false): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    if (!silent) console.log('Push messaging is not supported on this browser / device');
    return false;
  }

  try {
    let permission = Notification.permission;
    if (permission !== 'granted') {
      if (silent) {
        // Jangan tampilkan prompt browser jika silent/background
        return false;
      }
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      if (!silent) console.log('Notification permission not granted');
      return false;
    }

    const registration = await registerServiceWorker();
    if (!registration) {
      if (!silent) console.warn('Could not register service worker for push');
      return false;
    }

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nik,
        subscription,
        userAgent: navigator.userAgent
      })
    });

    console.log('[WebPush] Subscribed successfully for NIK:', nik);
    return true;
  } catch (error: any) {
    console.warn('Error subscribing to push:', error);
    return false;
  }
}
