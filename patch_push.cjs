const fs = require('fs');
let code = fs.readFileSync('src/push-notifications.ts', 'utf8');

code = code.replace(/const registration = await navigator\.serviceWorker\.register\('\/sw\.js'\);/, "const registration = await navigator.serviceWorker.ready;");

fs.writeFileSync('src/push-notifications.ts', code);
console.log("Patched push notifications");
