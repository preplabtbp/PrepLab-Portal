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

export async function subscribeUserToPush(nik: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push messaging is not supported');
    return false;
  }

  try {
    
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return false;
    }

    
    
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (let reg of registrations) {
      const scriptURL = reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || '';
      if (scriptURL.includes('custom-sw')) {
        console.log('Unregistering old custom-sw.js...');
        await reg.unregister();
      }
    }
    
    console.log('Registering service worker manually...');
    await navigator.serviceWorker.register('/sw.js');
    let registration = await navigator.serviceWorker.ready;
  

    console.log('Service Worker registered for push');

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

    return true;
  } catch (error) {
    console.error('Error subscribing to push:', error); alert('Error: ' + error.message);
    return false;
  }
}
