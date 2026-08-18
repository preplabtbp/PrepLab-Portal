const fs = require('fs');
let code = fs.readFileSync('src/db/schema.ts', 'utf8');

code = code.replace(
  /export const pemantauan = pgTable\('pemantauan', \{[\s\S]*?\}\);/,
  `export const pemantauan = pgTable('pemantauan', {
  id: serial('id').primaryKey(),
  tanggal: timestamp('tanggal').defaultNow(),
  inspectorName: text('inspector_name'),
  shift: text('shift'),
  lokasi: text('lokasi'),
  kategori: text('kategori'),
  suhu: text('suhu'),
  kelembapan: text('kelembapan'),
  suhu_up: text('suhu_up'),
  suhu_low: text('suhu_low'),
  kel_up: text('kel_up'),
  kel_low: text('kel_low'),
  flow: text('flow'),
  tekananGas: text('tekanan_gas'),
  kebocoran: text('kebocoran'),
  notes: text('notes'),
  photoUrl: text('photo_url'),
});`
);

fs.writeFileSync('src/db/schema.ts', code);
