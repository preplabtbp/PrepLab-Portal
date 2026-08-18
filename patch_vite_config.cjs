const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf8');

code = code.replace(/selfDestroying:\s*true,/g, '');

fs.writeFileSync('vite.config.ts', code);
console.log("Patched vite config");
