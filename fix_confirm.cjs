const fs = require('fs');
let code = fs.readFileSync('src/components/quiz-admin-screen.tsx', 'utf-8');

code = code.replace(
  /if \(\!window\.confirm\("Apakah Anda yakin ingin mengacak ulang pertanyaan untuk bulan ini\? Pertanyaan aktif akan diganti\!"\)\) return;/,
  ''
);

fs.writeFileSync('src/components/quiz-admin-screen.tsx', code);
