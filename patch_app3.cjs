const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /playNotificationSound\(\);/,
  "playNotificationSound();\n        toast(event.data.data.title, {\n          description: event.data.data.body,\n          icon: '🔔'\n        });"
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx 3");
