const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

code = code.replace(/<title>/, '<link rel="manifest" href="/manifest.json" />\n    <title>');

fs.writeFileSync('index.html', code);
console.log("Patched index.html");
