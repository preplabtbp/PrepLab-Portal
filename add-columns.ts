import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';
async function migrate() {
  try { await db.execute(sql`ALTER TABLE pemantauan ADD COLUMN tanggal timestamp DEFAULT now();`); } catch(e){}
  try { await db.execute(sql`ALTER TABLE pemantauan ADD COLUMN lokasi text;`); } catch(e){}
  try { await db.execute(sql`ALTER TABLE pemantauan ADD COLUMN kategori text;`); } catch(e){}
  try { await db.execute(sql`ALTER TABLE pemantauan ADD COLUMN suhu text;`); } catch(e){}
  try { await db.execute(sql`ALTER TABLE pemantauan ADD COLUMN kelembapan text;`); } catch(e){}
  try { await db.execute(sql`ALTER TABLE pemantauan ADD COLUMN suhu_up text;`); } catch(e){}
  try { await db.execute(sql`ALTER TABLE pemantauan ADD COLUMN suhu_low text;`); } catch(e){}
  try { await db.execute(sql`ALTER TABLE pemantauan ADD COLUMN kel_up text;`); } catch(e){}
  try { await db.execute(sql`ALTER TABLE pemantauan ADD COLUMN kel_low text;`); } catch(e){}
  try { await db.execute(sql`ALTER TABLE pemantauan ADD COLUMN flow text;`); } catch(e){}
  try { await db.execute(sql`ALTER TABLE pemantauan ADD COLUMN tekanan_gas text;`); } catch(e){}
  try { await db.execute(sql`ALTER TABLE pemantauan ADD COLUMN kebocoran text;`); } catch(e){}
}
migrate();
