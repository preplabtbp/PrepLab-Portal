const fs = require('fs');
let code = fs.readFileSync('src/push-notifications.ts', 'utf8');

const unregOld = `
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (let reg of registrations) {
      if (reg.active && reg.active.scriptURL.includes('custom-sw.js')) {
        await reg.unregister();
      }
    }
`;

code = code.replace(/let registration = await navigator\.serviceWorker\.getRegistration\(\);/, unregOld + '\n    let registration = await navigator.serviceWorker.getRegistration();');
fs.writeFileSync('src/push-notifications.ts', code);
console.log("Patched push 6");
