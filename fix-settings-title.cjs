const fs = require('fs');

let code = fs.readFileSync('src/components/settings-screen.tsx', 'utf8');
code = code.replace(/Pengaturan Sistem/g, 'Pengaturan');
code = code.replace(/Simpan Konfigurasi & Sistem/g, 'Simpan Konfigurasi');
fs.writeFileSync('src/components/settings-screen.tsx', code);

code = fs.readFileSync('src/components/apd-settings-screen.tsx', 'utf8');
code = code.replace(/Pengaturan Sistem/g, 'Pengaturan');
fs.writeFileSync('src/components/apd-settings-screen.tsx', code);
