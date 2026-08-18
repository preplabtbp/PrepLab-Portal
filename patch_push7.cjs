const fs = require('fs');
let code = fs.readFileSync('src/push-notifications.ts', 'utf8');

code = code.replace(
  /const registrations = await navigator\.serviceWorker\.getRegistrations\(\);[\s\S]*?let registration = await navigator\.serviceWorker\.getRegistration\(\);/,
  `
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (let reg of registrations) {
      const scriptURL = reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || '';
      if (scriptURL.includes('custom-sw')) {
        console.log('Unregistering old custom-sw.js...');
        await reg.unregister();
      }
    }
    let registration = await navigator.serviceWorker.getRegistration();
  `
);

fs.writeFileSync('src/push-notifications.ts', code);
console.log("Patched push 7");
