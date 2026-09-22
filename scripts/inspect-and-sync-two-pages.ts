import { Client } from '@notionhq/client';
import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const PAGES = [
  { id: '129d00c5-c809-8155-8029-e92dcba90b28', name: 'Pengecekan pH Scrubber' },
  { id: '1a4d00c5-c809-80be-bb61-db68030db35a', name: 'Pembersihan EDXRF' }
];

async function check() {
  for (const p of PAGES) {
    console.log(`\n==============================================`);
    console.log(`Checking: ${p.name} (${p.id})`);
    
    // Retrieve page
    try {
      const page: any = await notion.pages.retrieve({ page_id: p.id });
      console.log('Page Title:', JSON.stringify(page.properties));
    } catch (e: any) {
      console.error('Failed to retrieve page:', e.message);
    }

    // List comments
    try {
      const comments = await notion.comments.list({ block_id: p.id });
      console.log(`Found ${comments.results.length} Notion comments`);
      for (let i = 0; i < Math.min(5, comments.results.length); i++) {
        const c: any = comments.results[i];
        console.log(`Comment #${i + 1}: by ${c.created_by?.id}, text: ${c.rich_text?.map((r: any) => r.plain_text).join('')}`);
      }
    } catch (e: any) {
      console.error('Failed to retrieve comments:', e.message);
    }

    // List child blocks (for images embedded in page body)
    try {
      const blocks = await notion.blocks.children.list({ block_id: p.id, page_size: 100 });
      console.log(`Found ${blocks.results.length} child blocks`);
      const imgBlocks = blocks.results.filter((b: any) => b.type === 'image');
      console.log(`Image blocks: ${imgBlocks.length}`);
      for (const b of imgBlocks as any[]) {
        console.log('Image block:', b.image?.file?.url || b.image?.external?.url);
      }
    } catch (e: any) {
      console.error('Failed to list child blocks:', e.message);
    }

    // Check existing comments in local database
    const localComments = await db.execute(sql`
      SELECT id, author_name, topic_title, file_url, created_at FROM bulletin_comments 
      WHERE LOWER(topic_title) LIKE ${'%' + p.name.toLowerCase() + '%'}
      ORDER BY created_at ASC;
    `);
    console.log(`Local DB has ${localComments.rows.length} comments for "${p.name}"`);
    if (localComments.rows.length > 0) {
      console.log('First local comment:', localComments.rows[0]);
      console.log('Last local comment:', localComments.rows[localComments.rows.length - 1]);
    }
  }
}

check().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
