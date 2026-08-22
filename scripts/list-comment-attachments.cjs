const { Client } = require('@notionhq/client');
require('dotenv').config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function main() {
  const dbId = '12cd00c5-c809-80fb-b98b-cd89bcecd283';
  const rows = await notion.databases.query({ database_id: dbId });
  console.log(`Checking ${rows.results.length} topics for comments and attachments...`);

  const results = [];

  for (const row of rows.results) {
    const title = Object.values(row.properties).find(p => p.type === 'title')?.title?.[0]?.plain_text || 'Untitled';
    const comments = await notion.comments.list({ block_id: row.id });

    for (const c of comments.results) {
      if (c.attachments && c.attachments.length > 0) {
        results.push({
          topic: title,
          commentId: c.id,
          date: c.created_time,
          text: c.rich_text?.map(t => t.plain_text).join('').trim(),
          attachmentsCount: c.attachments.length,
          attachments: c.attachments.map(a => ({
            category: a.category,
            url: a.file?.url ? a.file.url.split('?')[0] : null
          }))
        });
      }
    }
  }

  console.log(`Found ${results.length} comments with attachments:`);
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
