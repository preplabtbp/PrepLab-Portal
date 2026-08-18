import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';
async function migrate() {
  const cols = [
    'id_form', 'judul_form', 'tipe_input', 'kategori', 'item', 'info1', 'info2'
  ];
  for (const c of cols) {
    try { 
       await db.execute(sql.raw(`ALTER TABLE questions ADD COLUMN ${c} text;`));
       console.log(`Added ${c}`);
    } catch(e) { console.error(`Error ${c}:`, e.message); }
  }
}
migrate();
