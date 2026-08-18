const fs = require('fs');
let code = fs.readFileSync('google-services.ts', 'utf8');
code = code.split('match(/\\\\/d\\\\/([a-zA-Z0-9-_]+)/)').join('match(/\\/d\\/([a-zA-Z0-9-_]+)/)');
fs.writeFileSync('google-services.ts', code);
