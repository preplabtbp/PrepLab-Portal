const { Client } = require('@notionhq/client');
require('dotenv').config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function main() {
  const dbId = '12cd00c5-c809-80fb-b98b-cd89bcecd283';
  const rows = await notion.databases.query({ database_id: dbId });
  
  // Find "Pengecekan Loker Lab"
  const lokerRow = rows.results.find(r => {
    const title = Object.values(r.properties).find(p => p.type === 'title')?.title?.[0]?.plain_text;
    return title && title.includes('Pengecekan Loker Lab');
  });

  if (!lokerRow) {
    console.log('Loker row not found!');
    return;
  }

  console.log('Found Loker Row:', lokerRow.id);
  
  // 1. Comments
  const comments = await notion.comments.list({ block_id: lokerRow.id });
  console.log('\n--- Comments Object ---');
  console.log(JSON.stringify(comments, null, 2));

  // 2. Block children of the page
  const blocks = await notion.blocks.children.list({ block_id: lokerRow.id });
  console.log('\n--- Page Blocks Children ---');
  console.log(JSON.stringify(blocks, null, 2));
}

main().catch(console.error);
