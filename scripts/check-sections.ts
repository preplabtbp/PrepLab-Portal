import { db } from '../src/db/index.js';
import { bulletinPosts } from '../src/db/schema.js';
import { ilike, or } from 'drizzle-orm';

async function main() {
  const allPosts = await db.select().from(bulletinPosts);
  console.log(`Total bulletin posts in DB: ${allPosts.length}`);

  const sectionKeywords = [
    'administrasi', 'preparasi', 'laboratorium', 'quality assurance', 
    'maintenance', 'warehouse', 'information', 'general issue'
  ];

  console.log('\n--- Section / Hub Posts ---');
  allPosts
    .filter(p => sectionKeywords.some(k => (p.title || '').toLowerCase().includes(k)))
    .forEach(p => {
      console.log(`[ID: ${p.id}] "${p.title}" | Category: ${p.category} | ContentLen: ${p.content ? p.content.length : 0}`);
    });

  const adminItems = [
    'Non Routine', 'Daily', 'Weekly', 'Monthly', 'Biannual', 'Yearly', 'Archived', 'PIC Job Admin',
    'Karyawan Baru', 'Cuti Karyawan', 'Induksi Online Karyawan Balik Cuti', 'TES SIMPER',
    'Interview Kandidat', 'Pengajuan PTK', 'Penilaian Karyawan', 'Meal Order',
    'Information Administrasi', 'Jam Kerja Karyawan'
  ];

  console.log('\n--- Admin Sub-items in DB ---');
  for (const it of adminItems) {
    const matches = allPosts.filter(p => (p.title || '').toLowerCase().includes(it.toLowerCase()));
    console.log(`${it} -> ${matches.map(m => `[ID: ${m.id}] "${m.title}"`).join(', ') || 'NONE'}`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
