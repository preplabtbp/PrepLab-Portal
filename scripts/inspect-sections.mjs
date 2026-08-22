import { db } from '../src/db/index.js';
import { bulletinPosts } from '../src/db/schema.js';
import { ilike } from 'drizzle-orm';

async function main() {
  const sections = [
    'information', 'administrasi', 'laboratorium', 'preparasi',
    'maintenance', 'inventory', 'manajemen mutu', 'general issue', 'prosedur'
  ];

  for (const s of sections) {
    const rows = await db.select().from(bulletinPosts).where(ilike(bulletinPosts.title, `%${s}%`));
    console.log(`\n=== Section query: "${s}" (Found ${rows.length}) ===`);
    for (const r of rows) {
      console.log(`- ID: ${r.id} | Title: "${r.title}" | PT: ${r.pt} | Length: ${r.content ? r.content.length : 0}`);
      if (r.content && r.content.length > 0) {
        console.log(`  Preview: ${r.content.substring(0, 150).replace(/\n/g, ' ')}...`);
      }
    }
  }
  process.exit(0);
}

main().catch(console.error);
