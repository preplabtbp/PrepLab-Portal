const fs = require('fs');
let code = fs.readFileSync('src/push-notifications.ts', 'utf8');
code = code.replace(/console.error\('Error subscribing to push:', error\);/, "console.error('Error subscribing to push:', error); alert('Error: ' + error.message);");
fs.writeFileSync('src/push-notifications.ts', code);
