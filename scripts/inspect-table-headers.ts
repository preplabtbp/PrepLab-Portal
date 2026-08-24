import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';

async function check() {
  const res = await db.execute(sql`
    SELECT id, title, content
    FROM bulletin_posts
    WHERE category = 'MANAJEMEN MUTU' OR title ILIKE '%Manajemen Mutu%'
    ORDER BY id ASC;
  `);

  for (const row of res.rows as any[]) {
    const lines = (row.content || '').split('\n');
    const th = lines.find((l: string) => l.trim().startsWith('|') && l.includes('|'));
    if (th) console.log(row.id, row.title, '-->', th);
  }
  process.exit(0);
}
check();
