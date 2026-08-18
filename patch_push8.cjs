const fs = require('fs');
let code = fs.readFileSync('src/push-notifications.ts', 'utf8');

code = code.replace(
  /let registration = await navigator\.serviceWorker\.getRegistration\(\);[\s\S]*?registration = await navigator\.serviceWorker\.ready;/g,
  `
    console.log('Registering service worker manually...');
    await navigator.serviceWorker.register('/sw.js');
    let registration = await navigator.serviceWorker.ready;
  `
);

fs.writeFileSync('src/push-notifications.ts', code);
console.log("Patched push 8");
