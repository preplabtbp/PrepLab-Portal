import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { ErrorBoundary } from './components/error-boundary.tsx';
import './index.css';

// Auto-recovery for stale dynamic imports / new deployment chunks
window.addEventListener('vite:preloadError', (event) => {
  console.warn('[Vite] Preload error encountered, auto-reloading page...', event);
  window.location.reload();
});

window.addEventListener('error', (e) => {
  if (e?.message && /Failed to fetch dynamically imported module/i.test(e.message)) {
    const key = 'preplab_auto_reload_token';
    const now = Date.now();
    const lastReload = parseInt(sessionStorage.getItem(key) || '0', 10);
    if (now - lastReload > 5000) {
      sessionStorage.setItem(key, String(now));
      console.warn('[DynamicImport] Reloading due to outdated bundle chunk...');
      window.location.reload();
    }
  }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes cache validity
    },
  },
});

import { Toaster } from 'sonner';

const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  config = config || {};
  config.credentials = config.credentials || 'include';

  const token = localStorage.getItem('p2h_token') || localStorage.getItem('token');
  if (token && typeof resource === 'string' && (resource.startsWith('/api/') || resource.startsWith('http://localhost:3000/api/'))) {
    const headers = new Headers(config.headers || {});
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    config.headers = headers;
  }
  
  const profileStr = localStorage.getItem('p2h_inspector_profile');
  let pt = 'TBP';
  if (profileStr) {
     try { 
       const parsedPt = (JSON.parse(profileStr).pt || 'TBP').toUpperCase();
       // TBP and GPS are treated as 1 single data entity (TBP). Only GTS is separate.
       pt = parsedPt === 'GTS' ? 'GTS' : 'TBP';
     } catch(e){}
  }
  
  if (typeof resource === 'string' && resource.startsWith('/api/')) {
     const urlObj = new URL(resource, window.location.origin);
     if (!urlObj.searchParams.has('pt') && !urlObj.pathname.includes('/maintenance-summary')) {
        urlObj.searchParams.set('pt', pt);
     }
     resource = urlObj.pathname + urlObj.search;
     
     if (config && config.body && typeof config.body === 'string') {
        try {
           const bodyObj = JSON.parse(config.body);
           if (typeof bodyObj === 'object' && bodyObj !== null && !bodyObj.pt) {
              bodyObj.pt = pt;
              config.body = JSON.stringify(bodyObj);
           }
        } catch(e) {}
     }
  }
  return originalFetch(resource, config);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <Toaster position="top-center" richColors />
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
);

// Enable service worker for push notifications
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  // handled in push-notifications.ts now or vite-plugin-pwa
}
