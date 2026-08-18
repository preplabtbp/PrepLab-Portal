const fs = require('fs');
let code = fs.readFileSync('src/main.tsx', 'utf8');

// Remove the unregister code
const unregisterCode = `// Unregister service workers to avoid aggressive caching during development
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.unregister();
    }
  });
}`;
code = code.replace(unregisterCode, `// Enable service worker for push notifications
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  // handled in push-notifications.ts now or vite-plugin-pwa
}`);
fs.writeFileSync('src/main.tsx', code);
