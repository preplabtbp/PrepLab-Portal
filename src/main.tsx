import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { ErrorBoundary } from './components/error-boundary.tsx';;
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

import { Toaster } from 'sonner';

const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  const profileStr = localStorage.getItem('p2h_inspector_profile');
  let pt = 'TBP';
  if (profileStr) {
     try { pt = JSON.parse(profileStr).pt || 'TBP'; } catch(e){}
  }
  
  if (typeof resource === 'string' && resource.startsWith('/api/')) {
     const urlObj = new URL(resource, window.location.origin);
     urlObj.searchParams.set('pt', pt);
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
