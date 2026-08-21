import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import fetch from 'node-fetch';

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const PAGE_ID = '12bd00c5-c809-8006-a5a8-fb55eb68f5d8';

const notion = new Client({ auth: NOTION_API_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

function getTitle(props) {
  if (!props) return 'Untitled';
  for (const key in props) {
    if (props[key].type === 'title') return props[key].title?.[0]?.plain_text || 'Untitled';
  }
  return 'Untitled';
}

async function preprocessBlocks(blocks) {
  for (const block of blocks) {
    if (block.type === 'child_page') {
      block.type = 'heading_2';
      block.heading_2 = {
        rich_text: [{ type: 'text', text: { content: block.child_page.title }, plain_text: block.child_page.title }]
      };
    } else if (block.type === 'child_database') {
      block.type = 'heading_2';
      block.heading_2 = {
        rich_text: [{ type: 'text', text: { content: block.child_database.title }, plain_text: block.child_database.title }]
      };
    } else if (block.type === 'column_list' || block.type === 'column') {
      const children = await notion.blocks.children.list({ block_id: block.id });
      block[block.type] = { children: children.results };
      await preprocessBlocks(block[block.type].children);
    } else if (block.has_children) {
      const children = await notion.blocks.children.list({ block_id: block.id });
      block[block.type].children = children.results;
      await preprocessBlocks(block[block.type].children);
    }
  }
}

async function getPageContent(pageId) {
  try {
    const fs = require('fs');
    let md = fs.readFileSync('temp_content.md', 'utf8');
    return md.trim() || '*No content*';
  } catch(e) { return '*No content*'; }
}

async function main() {
  console.log('Fetching page...', PAGE_ID);
  const page = await notion.pages.retrieve({ page_id: PAGE_ID });
  const title = getTitle(page.properties);
  const pt = 'TBP'; // default
  const coverImage = page.cover ? (page.cover.type==='external' ? page.cover.external.url : page.cover.file?.url) : null;
  console.log('Page:', title, '[' + pt + ']');
  const content = await getPageContent(PAGE_ID);
  
  const payload = { 
    title, 
    notionId: PAGE_ID, 
    department: 'Prep & Lab', 
    category: 'INFO::1', 
    tags: [], 
    coverImage, 
    content, 
    originalCreatedAt: page.created_time, 
    authorNik: 'SYSTEM', 
    authorName: 'Notion Import', 
    pt 
  };
  
  console.log('Uploading to local DB via API...');
  const res = await fetch('http://localhost:3000/api/bulletin/migrate-notion', { 
    method: 'POST', 
    headers: {'Content-Type':'application/json'}, 
    body: JSON.stringify(payload) 
  });
  
  if (res.ok) console.log('OK:', title); 
  else console.error('FAIL:', title, await res.text());
}

main().catch(console.error);
