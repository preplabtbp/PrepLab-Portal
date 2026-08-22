const { Client } = require('@notionhq/client');
require('dotenv').config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function main() {
  const pageId = '12ad00c5-c809-8138-bbd1-c6cfbb858729';
  const blocks = await notion.blocks.children.list({ block_id: pageId });
  const dbBlock = blocks.results.find(b => b.type === 'child_database');
  
  const allRows = await notion.databases.query({ database_id: dbBlock.id });
  console.log('Total rows in DB:', allRows.results.length);

  const activeRows = [];
  const closedRows = [];

  for (const row of allRows.results) {
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
    if (formatted.Status === 'CLOSE') {
      closedRows.push(formatted);
    } else {
      activeRows.push(formatted);
    }
  }

  console.log(`\nActive / Non-Closed Rows (${activeRows.length}):`);
  console.table(activeRows);

  console.log(`\nClosed Rows (${closedRows.length}):`);
  console.table(closedRows.slice(0, 10));
}

main().catch(console.error);
