const { Client } = require('@notionhq/client');
require('dotenv').config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function main() {
  const dbId = '12cd00c5-c809-80fb-b98b-cd89bcecd283';
  const rows = await notion.databases.query({ database_id: dbId, page_size: 100 });
  console.log(`Scanning ${rows.results.length} topics for comment attachments...`);

  let totalComments = 0;
  let totalAttachments = 0;

  for (const row of rows.results) {
    const props = row.properties;
    const title = Object.values(props).find(p => p.type === 'title')?.title?.[0]?.plain_text || 'Untitled';
    const comments = await notion.comments.list({ block_id: row.id });
    
    totalComments += comments.results.length;

    for (const c of comments.results) {
      if (c.attachments && c.attachments.length > 0) {
        totalAttachments += c.attachments.length;
        console.log(`\n========================================`);
        console.log(`TOPIC: "${title}"`);
        console.log(`Comment ID: ${c.id}`);
        console.log(`Created By: ${c.created_by?.id} | Date: ${c.created_time}`);
        console.log(`Text: "${c.rich_text?.map(t => t.plain_text).join('')}"`);
        console.log(`Attachments (${c.attachments.length}):`, JSON.stringify(c.attachments, null, 2));
      }
    }
  }

  console.log(`\n----------------------------------------`);
  console.log(`Finished scan: Found ${totalAttachments} attachments across ${totalComments} comments.`);
}

main().catch(console.error);
