const fs = require('fs');
let code = fs.readFileSync('src/push-notifications.ts', 'utf8');

code = code.replace(
  /\/custom-sw\.js',\s*\{\s*type: import\.meta\.env\.DEV \? 'module' : 'classic'\s*\}/,
  "'/sw.js'"
);

fs.writeFileSync('src/push-notifications.ts', code);
console.log("Patched push 4");
