const fs = require('fs');
let code = fs.readFileSync('src/components/preplab-cloud-screen.tsx', 'utf-8');

code = code.replace(/variant="outline"/g, 'variant="secondary"');

fs.writeFileSync('src/components/preplab-cloud-screen.tsx', code);
