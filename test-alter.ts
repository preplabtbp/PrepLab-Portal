import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';
async function migrate() {
  const cols = [
    'jabatan', 'job_grade', 'section', 'gol', 'shift', 'poh', 'pt', 
    'status_mess', 'rotation', 'tanggal_awal_bergabung', 'tanggal_bergabung_terbaru', 'status_kontrak'
  ];
  for (const c of cols) {
    try { 
      await db.execute(sql.raw(`ALTER TABLE employees ADD COLUMN ${c} text;`)); 
      console.log(`Added ${c}`);
    } catch(e) { console.error(`Error ${c}:`, e.message); }
  }
  try { 
    await db.execute(sql.raw(`ALTER TABLE roster ADD COLUMN date text;`)); 
    console.log(`Added roster date`);
  } catch(e) { console.error(`Error roster date:`, e.message); }
}
migrate();
