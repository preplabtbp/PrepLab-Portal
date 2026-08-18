const fs = require('fs');
let code = fs.readFileSync('src/sheets-api.ts', 'utf-8');
code = code.replace('jabatan: d.position,', 'jabatan: d.jabatan || d.position,');
code = code.replace('divisi: d.department,', 'divisi: d.section || d.department,');
fs.writeFileSync('src/sheets-api.ts', code);
