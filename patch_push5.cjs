const fs = require('fs');
let code = fs.readFileSync('src/push-notifications.ts', 'utf8');

code = code.replace(/''\/sw\.js'/, "'/sw.js'");

fs.writeFileSync('src/push-notifications.ts', code);
console.log("Patched push 5");
