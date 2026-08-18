const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(/sendWebPush\(__notif\[0\]\)/g, 'sendWebPush(__notif)');
fs.writeFileSync('server.ts', code);
console.log("Replaced __notif[0] -> __notif successfully!");
