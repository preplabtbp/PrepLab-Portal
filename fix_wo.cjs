const fs = require('fs');
let code = fs.readFileSync('src/components/create-wo-screen.tsx', 'utf8');
code = code.replace(/validation\.error\.errors\[0\]\.message/g, 'validation.error.issues[0].message');
fs.writeFileSync('src/components/create-wo-screen.tsx', code);
console.log('Patched');
