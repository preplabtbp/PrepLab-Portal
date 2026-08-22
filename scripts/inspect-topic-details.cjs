const { Client } = require('@notionhq/client');
require('dotenv').config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function main() {
  const dbId = '12cd00c5-c809-80fb-b98b-cd89bcecd283';
  const rows = await notion.databases.query({ database_id: dbId, page_size: 100 });
  console.log(`Inspecting ${rows.results.length} topics in Non Routine Laboratorium...`);

  for (const row of rows.results) {
    const props = row.properties;
    const title = Object.values(props).find(p => p.type === 'title')?.title?.[0]?.plain_text || 'Untitled';
    const comments = await notion.comments.list({ block_id: row.id });
    
    if (comments.results.length > 0) {
      console.log(`\n========================================`);
      console.log(`TOPIC: "${title}" (${comments.results.length} comments) [Page ID: ${row.id}]`);
      console.log(`========================================`);
      
      for (const c of comments.results) {
        console.log(`- Author ID: ${c.created_by?.id} | Date: ${c.created_time}`);
        console.log(`  Raw rich_text:`, JSON.stringify(c.rich_text, null, 2));
      }
    }
  }
}

main().catch(console.error);
