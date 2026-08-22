const { Client } = require('@notionhq/client');
require('dotenv').config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function main() {
  const pageId = '12ad00c5-c809-8138-bbd1-c6cfbb858729';
  console.log('Fetching child databases for page:', pageId);

  const blocks = await notion.blocks.children.list({ block_id: pageId });
  const dbBlock = blocks.results.find(b => b.type === 'child_database');
  console.log('Database ID:', dbBlock.id);

  const rows = await notion.databases.query({
    database_id: dbBlock.id,
    page_size: 100
  });

  console.log(`Found ${rows.results.length} rows in Notion database.`);

  for (const row of rows.results) {
    const props = row.properties;
    const titleProp = Object.values(props).find(p => p.type === 'title');
    const title = titleProp?.title?.[0]?.plain_text || 'Untitled';
    const statusProp = Object.values(props).find(p => p.type === 'status' || p.type === 'select');
    const status = statusProp?.status?.name || statusProp?.select?.name || '-';

    console.log(`\n=== Topic: "${title}" (Status: ${status}) | Page ID: ${row.id} ===`);

    try {
      // 1. Check Notion Comments API
      const commentsRes = await notion.comments.list({ block_id: row.id });
      console.log(`  Comments count via API: ${commentsRes.results.length}`);
      for (const c of commentsRes.results) {
        console.log(`    - [Comment by ${c.created_by?.id || 'Unknown'} at ${c.created_time}]:`);
        const text = c.rich_text?.map(t => t.plain_text).join('') || '';
        console.log(`      "${text}"`);
      }
    } catch (e) {
      console.log(`  Error getting comments: ${e.message}`);
    }

    try {
      // 2. Check page body blocks (sometimes updates are written inside the page body)
      const pageBlocks = await notion.blocks.children.list({ block_id: row.id });
      console.log(`  Page blocks count: ${pageBlocks.results.length}`);
      for (const pb of pageBlocks.results) {
        console.log(`    - Block Type: ${pb.type}`);
        if (pb[pb.type]?.rich_text) {
          const text = pb[pb.type].rich_text.map(t => t.plain_text).join('');
          console.log(`      Content: "${text}"`);
        }
      }
    } catch (e) {
      console.log(`  Error getting blocks: ${e.message}`);
    }
  }
}

main().catch(console.error);
