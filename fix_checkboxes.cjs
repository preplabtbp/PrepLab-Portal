const fs = require('fs');
let code = fs.readFileSync('src/components/induksi-screen.tsx', 'utf8');

code = code.replace(/checked=\{materi\.(m\d+)\}/g, 'checked={materi.$1 || false}');

fs.writeFileSync('src/components/induksi-screen.tsx', code);
