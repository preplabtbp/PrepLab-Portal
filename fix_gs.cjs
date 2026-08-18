const fs = require('fs');
let code = fs.readFileSync('google-services.ts', 'utf8');
code = code.replace(/\\\`/g, '\`');
code = code.replace(/\\\$/g, '$');
code = code.replace(/\\\\d\\\\/g, '\\/d\\/');
fs.writeFileSync('google-services.ts', code);
