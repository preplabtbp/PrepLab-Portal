import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';
async function migrate() {
  try { await db.execute(sql`ALTER TABLE employees ADD COLUMN jabatan text;`); } catch(e){}
  try { await db.execute(sql`ALTER TABLE employees ADD COLUMN job_grade text;`); } catch(e){}
  try { await db.execute(sql`ALTER TABLE employees ADD COLUMN section text;`); } catch(e){}
  try { await db.execute(sql`ALTER TABLE employees ADD COLUMN gol text;`); } catch(e){}
  try { await db.execute(sql`ALTER TABLE employees ADD COLUMN shift text;`); } catch(e){}
  try { await db.execute(sql`ALTER TABLE employees ADD COLUMN poh text;`); } catch(e){}
  try { await db.execute(sql`ALTER TABLE employees ADD COLUMN pt text;`); } catch(e){}
  try { await db.execute(sql`ALTER TABLE employees ADD COLUMN status_mess text;`); } catch(e){}
  try { await db.execute(sql`ALTER TABLE employees ADD COLUMN rotation text;`); } catch(e){}
  try { await db.execute(sql`ALTER TABLE employees ADD COLUMN tanggal_awal_bergabung text;`); } catch(e){}
  try { await db.execute(sql`ALTER TABLE employees ADD COLUMN tanggal_bergabung_terbaru text;`); } catch(e){}
  try { await db.execute(sql`ALTER TABLE employees ADD COLUMN status_kontrak text;`); } catch(e){}
  
  try { await db.execute(sql`ALTER TABLE roster ADD COLUMN date text;`); } catch(e){}
  
  // try to drop existing roster columns we dont need if possible
}
migrate();
