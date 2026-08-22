const { Client } = require('@notionhq/client');
require('dotenv').config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function main() {
  const pageId = '12ad00c5-c809-8138-bbd1-c6cfbb858729';
  console.log('Querying Notion page:', pageId);

  const page = await notion.pages.retrieve({ page_id: pageId });
  console.log('Page Title / Properties:', JSON.stringify(page.properties, null, 2));

  const blocks = await notion.blocks.children.list({ block_id: pageId });
  console.log('Blocks found:', blocks.results.length);
  for (const b of blocks.results) {
    console.log(`- Type: ${b.type} | ID: ${b.id}`);
    if (b.type === 'child_database') {
      console.log('  Child DB Title:', b.child_database.title);
      const dbRows = await notion.databases.query({ database_id: b.id });
      console.log(`  Database has ${dbRows.results.length} rows:`);
      for (const row of dbRows.results) {
        const props = row.properties;
        const formatted = {};
        for (const [k, v] of Object.entries(props)) {
          if (v.type === 'title') formatted[k] = v.title?.[0]?.plain_text;
          else if (v.type === 'rich_text') formatted[k] = v.rich_text?.[0]?.plain_text;
          else if (v.type === 'status') formatted[k] = v.status?.name;
          else if (v.type === 'select') formatted[k] = v.select?.name;
          else if (v.type === 'multi_select') formatted[k] = v.multi_select?.map(x => x.name).join(', ');
          else if (v.type === 'date') formatted[k] = v.date?.start;
          else if (v.type === 'number') formatted[k] = v.number;
        }
        console.log('   Row:', JSON.stringify(formatted));
      }
    }
  }
}

main().catch(console.error);
