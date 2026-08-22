import { db } from '../src/db/index.js';
import { bulletinPosts, agendaEvents } from '../src/db/schema.js';
import { ilike, or, eq } from 'drizzle-orm';

async function main() {
  const posts = await db.select().from(bulletinPosts).where(
    or(
      eq(bulletinPosts.category, 'MEETING'),
      eq(bulletinPosts.category, 'WEEKLY'),
      ilike(bulletinPosts.title, '%meeting%'),
      ilike(bulletinPosts.title, '%rapat%'),
      ilike(bulletinPosts.title, '%weekly%')
    )
  );

  console.log(`Found ${posts.length} meeting/weekly posts in bulletin`);

  for (const post of posts) {
    const existing = await db.select().from(agendaEvents).where(eq(agendaEvents.bulletinPostId, post.id));
    if (existing.length === 0) {
      const eventId = `ag-bulletin-${post.id}-${Date.now()}`;
      await db.insert(agendaEvents).values({
        id: eventId,
        title: post.title.startsWith('[') ? post.title : `[Meeting] ${post.title}`,
        startDate: post.createdAt ? new Date(post.createdAt) : new Date(),
        endDate: new Date((post.createdAt ? new Date(post.createdAt).getTime() : Date.now()) + 60 * 60 * 1000),
        kategori: 'General',
        pic: post.authorName || 'PIC Prep & Lab',
        deskripsi: post.content ? post.content.substring(0, 500) : '',
        creatorNik: post.authorNik || null,
        department: post.department || 'ALL',
        bulletinPostId: post.id,
      });
      console.log(`✓ Synced: [${post.id}] ${post.title} -> Agenda ID: ${eventId}`);
    } else {
      console.log(`- Already synced: [${post.id}] ${post.title}`);
    }
  }

  const allEvents = await db.select().from(agendaEvents);
  console.log(`Total events in agenda_events: ${allEvents.length}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
