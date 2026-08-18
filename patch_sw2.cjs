const fs = require('fs');
let code = fs.readFileSync('public/sw.js', 'utf8');

code = code.replace(
  /self\.clients\.matchAll\(\)/,
  "self.clients.matchAll({ type: 'window', includeUncontrolled: true })"
);

code = code.replace(
  /requireInteraction: true,/,
  "requireInteraction: true,\n      silent: false,"
);

if (!code.includes('self.skipWaiting')) {
  code += `\n\nself.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});\n`;
}

fs.writeFileSync('public/sw.js', code);
console.log("Patched SW 2");
