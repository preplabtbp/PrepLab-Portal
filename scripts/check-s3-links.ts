import { db } from '../src/db/index.js';
import { bulletinPosts } from '../src/db/schema.js';
import { like } from 'drizzle-orm';

async function main() {
  const rows = await db.select().from(bulletinPosts).where(like(bulletinPosts.content, '%prod-files-secure.s3%'));
  console.log('Posts containing Notion S3 links:', rows.length);
  for (const r of rows) {
    console.log(`- ID: ${r.id} | Title: "${r.title}"`);
    const links = r.content.match(/https:\/\/prod-files-secure\.s3[^\s\)\"\']+/g) || [];
    console.log(`  Count of S3 links: ${links.length}`);
    for (const l of links) {
      console.log(`  URL: ${l.substring(0, 100)}...`);
    }
  }
  process.exit(0);
}

main().catch(console.error);
