const { Client } = require('@notionhq/client');
require('dotenv').config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const PAGE_ID = '12bd00c5-c809-8057-8957-f015eec446ea';

async function inspectBlocks(blockId, depth = 0) {
  let hasMore = true;
  let startCursor = undefined;
  const indent = '  '.repeat(depth);

  while (hasMore) {
    const res = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: startCursor,
      page_size: 100
    });

    for (const b of res.results) {
      console.log(`${indent}- Type: ${b.type} (ID: ${b.id})`);
      if (b.type === 'file') {
        const fileObj = b.file.file || b.file.external;
        const name = b.file.name || 'unnamed_file';
        console.log(`${indent}  📎 FILE: ${name} | URL: ${fileObj?.url?.substring(0, 80)}...`);
      } else if (b.type === 'pdf') {
        const pdfObj = b.pdf.file || b.pdf.external;
        console.log(`${indent}  📄 PDF: URL: ${pdfObj?.url?.substring(0, 80)}...`);
      } else if (b.type === 'child_page') {
        console.log(`${indent}  📄 CHILD PAGE: "${b.child_page.title}" (${b.id})`);
        await inspectBlocks(b.id, depth + 1);
      } else if (b.type === 'child_database') {
        console.log(`${indent}  🗄️ CHILD DATABASE: "${b.child_database.title}" (${b.id})`);
        const dbQuery = await notion.databases.query({ database_id: b.id, page_size: 100 });
        console.log(`${indent}    Rows: ${dbQuery.results.length}`);
        for (const row of dbQuery.results) {
          const title = row.properties.Name?.title?.[0]?.plain_text || 
                        row.properties.Judul?.title?.[0]?.plain_text || 
                        row.properties.title?.title?.[0]?.plain_text || 
                        row.properties['Nama File']?.title?.[0]?.plain_text ||
                        row.properties.IK?.title?.[0]?.plain_text || '(no-title)';
          console.log(`${indent}    - Row: "${title}" (${row.id})`);
          // check if row has files or child blocks
          for (const [propName, propVal] of Object.entries(row.properties)) {
            if (propVal.type === 'files' && propVal.files?.length > 0) {
              console.log(`${indent}      📎 Property "${propName}":`, propVal.files.map(f => f.name || f.file?.url));
            }
          }
          await inspectBlocks(row.id, depth + 2);
        }
      } else if (b.type === 'paragraph' || b.type === 'bulleted_list_item' || b.type === 'numbered_list_item' || b.type === 'to_do' || b.type === 'toggle') {
        const text = b[b.type]?.rich_text?.map(t => t.plain_text).join('') || '';
        if (text) console.log(`${indent}  📝 ${b.type}: ${text}`);
        if (b.has_children) {
          await inspectBlocks(b.id, depth + 1);
        }
      } else if (b.has_children) {
        await inspectBlocks(b.id, depth + 1);
      }
    }

    hasMore = res.has_more;
    startCursor = res.next_cursor;
  }
}

async function main() {
  console.log('Inspecting IK Preparasi page:', PAGE_ID);
  await inspectBlocks(PAGE_ID);
}

main().catch(console.error);
