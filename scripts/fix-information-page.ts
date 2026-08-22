import { db } from '../src/db/index.js';
import { bulletinPosts } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const INFO_PAGE_ID = '12bd00c5-c809-8006-a5a8-fb55eb68f5d8';

async function blockToMarkdown(blockId: string): Promise<string> {
  let md = '';
  let cursor: string | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    const res: any = await notion.blocks.children.list({ block_id: blockId, start_cursor: cursor, page_size: 100 });
    for (const b of res.results) {
      if (b.type === 'child_page') {
        const title = b.child_page?.title || 'Untitled';
        md += `\n## ${title}\n\n`;
      } else if (b.type === 'child_database') {
        const title = b.child_database?.title || 'Database';
        md += `\n## ${title}\n\n`;
      } else if (b.type === 'heading_1') {
        const text = b.heading_1.rich_text.map((t: any) => t.plain_text).join('');
        md += `\n# ${text}\n\n`;
      } else if (b.type === 'heading_2') {
        const text = b.heading_2.rich_text.map((t: any) => t.plain_text).join('');
        md += `\n## ${text}\n\n`;
      } else if (b.type === 'heading_3') {
        const text = b.heading_3.rich_text.map((t: any) => t.plain_text).join('');
        md += `\n### ${text}\n\n`;
      } else if (b.type === 'paragraph') {
        const text = b.paragraph.rich_text.map((t: any) => t.plain_text).join('');
        if (text) md += `${text}\n\n`;
      } else if (b.type === 'bulleted_list_item') {
        const text = b.bulleted_list_item.rich_text.map((t: any) => t.plain_text).join('');
        md += `- ${text}\n`;
      } else if (b.type === 'numbered_list_item') {
        const text = b.numbered_list_item.rich_text.map((t: any) => t.plain_text).join('');
        md += `1. ${text}\n`;
      } else if (b.type === 'toggle') {
        const text = b.toggle.rich_text.map((t: any) => t.plain_text).join('');
        md += `\n### ${text}\n\n`;
      } else if (b.type === 'callout') {
        const text = b.callout.rich_text.map((t: any) => t.plain_text).join('');
        md += `> ${text}\n\n`;
      } else if (b.type === 'divider') {
        md += '---\n\n';
      }

      if (b.has_children && (b.type === 'column_list' || b.type === 'column' || b.type === 'toggle')) {
        const childMd = await blockToMarkdown(b.id);
        md += childMd;
      }
    }
    hasMore = res.has_more;
    cursor = res.next_cursor;
  }
  return md;
}

async function main() {
  console.log('Generating markdown for INFORMATION page from Notion...');
  const md = await blockToMarkdown(INFO_PAGE_ID);
  console.log('Generated markdown length:', md.length);
  console.log('Sample:', md.substring(0, 300));

  console.log('Updating bulletin_posts record ID 479 (INFORMATION)...');
  const result = await db.update(bulletinPosts)
    .set({
      content: md.trim()
    })
    .where(eq(bulletinPosts.id, 479))
    .returning();

  console.log('Updated row:', result[0]?.id, result[0]?.title);
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
