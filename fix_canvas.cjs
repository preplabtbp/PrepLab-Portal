const fs = require('fs');
let code = fs.readFileSync('src/components/induksi-screen.tsx', 'utf8');

code = code.replace(/getTrimmedCanvas\(\)/g, 'getCanvas()');

fs.writeFileSync('src/components/induksi-screen.tsx', code);
