import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import fetch from 'node-fetch';

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const ROOT_PAGE_ID = '128d00c5-c809-802f-a74e-f390708c9afe';

const notion = new Client({ auth: NOTION_API_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

n2m.setCustomTransformer('child_page', async (block) => {
  if (block.child_page && block.child_page.title) {
    return `## ${block.child_page.title}`;
  }
  return '';
});

n2m.setCustomTransformer('child_database', async (block) => {
  if (block.child_database && block.child_database.title) {
    return `## ${block.child_database.title}`;
  }
  return '';
});

function getTitle(props) {
  if (!props) return 'Untitled';
  for (const key in props) {
    if (props[key].type === 'title') return props[key].title?.[0]?.plain_text || 'Untitled';
  }
  return 'Untitled';
}

async function getPageContent(pageId) {
  try {
    const mdblocks = await n2m.pageToMarkdown(pageId);
    let md = n2m.toMarkdownString(mdblocks).parent || '';
    return md.trim() || '*No content*';
  } catch(e) { return '*No content*'; }
}

async function processPage(pageId) {
  console.log('Fetching page:', pageId);
  try {
    const page = await notion.pages.retrieve({ page_id: pageId });
    const title = getTitle(page.properties);
    const coverImage = page.cover ? (page.cover.type==='external' ? page.cover.external.url : page.cover.file?.url) : null;
    console.log(' -> Title:', title);
    
    // Only upload if it's not the root page (or upload root too, doesn't matter)
    const content = await getPageContent(pageId);
    const payload = { 
      title, 
      notionId: pageId, 
      department: 'Prep & Lab', 
      category: 'INFO::1', 
      tags: [], 
      coverImage, 
      content, 
      originalCreatedAt: page.created_time, 
      authorNik: 'SYSTEM', 
      authorName: 'Notion Import', 
      pt: 'TBP' 
    };
    
    await fetch('http://localhost:3000/api/bulletin/migrate-notion', { 
      method: 'POST', 
      headers: {'Content-Type':'application/json'}, 
      body: JSON.stringify(payload) 
    });
    console.log('    Saved:', title);
  } catch(e) {
    console.log('    Error reading page:', e.message);
  }

  async function findChildPages(blockId) {
    let hasMore = true;
    let cursor = undefined;
    while(hasMore) {
      try {
        const blocks = await notion.blocks.children.list({
          block_id: blockId,
          start_cursor: cursor,
          page_size: 100
        });
        
        for (const block of blocks.results) {
          if (block.type === 'child_page') {
            await processPage(block.id);
          } else if (block.type === 'child_database') {
            console.log('    Found DB:', block.child_database.title);
          } else if (block.has_children) {
            await findChildPages(block.id);
          }
        }
        
        hasMore = blocks.has_more;
        cursor = blocks.next_cursor;
      } catch(e) {
        console.log('    Error reading children of', blockId, ':', e.message);
        break;
      }
    }
  }

  await findChildPages(pageId);
}

async function main() {
  console.log('Starting recursive sync from root TBP page...');
  await processPage(ROOT_PAGE_ID);
  
  // Try GTS root page as well
  const GTS_ROOT_ID = '135d00c5-c809-8041-85f5-eb3f09667469';
  console.log('Starting recursive sync from root GTS page...');
  await processPage(GTS_ROOT_ID);
  
  console.log('All Done!');
}

main().catch(console.error);
