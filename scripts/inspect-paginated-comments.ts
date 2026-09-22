import { Client } from '@notionhq/client';
import dotenv from 'dotenv';
dotenv.config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const PAGES = [
  { id: '129d00c5-c809-8155-8029-e92dcba90b28', name: 'Pengecekan pH Scrubber' },
  { id: '1a4d00c5-c809-80be-bb61-db68030db35a', name: 'Pembersihan EDXRF' }
];

async function inspectComments() {
  for (const p of PAGES) {
    console.log(`\n==============================================`);
    console.log(`PAGINATED COMMENTS FOR: ${p.name} (${p.id})`);
    
    let allComments: any[] = [];
    let cursor: string | undefined = undefined;
    let pageNum = 1;

    do {
      const resp: any = await notion.comments.list({ block_id: p.id, start_cursor: cursor, page_size: 100 });
      console.log(`Batch ${pageNum}: ${resp.results.length} comments, has_more: ${resp.has_more}`);
      allComments = allComments.concat(resp.results);
      cursor = resp.has_more ? resp.next_cursor : undefined;
      pageNum++;
    } while (cursor);

    console.log(`Total Notion comments retrieved: ${allComments.length}`);

    // Print the last 10 comments (newest)
    console.log(`\nLast 10 comments (newest):`);
    const last10 = allComments.slice(-10);
    for (const c of last10) {
      console.log('---');
      console.log('ID:', c.id);
      console.log('Created:', c.created_time);
      console.log('Created by:', c.created_by?.id);
      console.log('Rich text length:', c.rich_text?.length);
      console.log('Full JSON:', JSON.stringify(c, null, 2));
    }
  }
}

inspectComments().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
