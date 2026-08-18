const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(/\{inspectorNik === '02D25000055' && \(/g, '{true && (');
code = code.replace(/label="Sistem"/g, 'label="Pengaturan"');
fs.writeFileSync('src/App.tsx', code);
