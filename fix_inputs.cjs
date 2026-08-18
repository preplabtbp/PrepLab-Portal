const fs = require('fs');
let code = fs.readFileSync('src/components/induksi-screen.tsx', 'utf8');

code = code.replace(/value=\{namaPeserta\}/g, 'value={namaPeserta || ""}');
code = code.replace(/value=\{nikPeserta\}/g, 'value={nikPeserta || ""}');
code = code.replace(/value=\{jabatanPeserta\}/g, 'value={jabatanPeserta || ""}');
code = code.replace(/value=\{namaInduktor\}/g, 'value={namaInduktor || ""}');
code = code.replace(/value=\{nikInduktor\}/g, 'value={nikInduktor || ""}');
code = code.replace(/value=\{jabatanInduktor\}/g, 'value={jabatanInduktor || ""}');

fs.writeFileSync('src/components/induksi-screen.tsx', code);
