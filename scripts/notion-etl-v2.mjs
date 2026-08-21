import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import fetch from 'node-fetch';

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const PORTAL_API_URL = process.env.PORTAL_API_URL || 'http://localhost:3000/api/bulletin/migrate-notion';

const notion = new Client({ auth: NOTION_API_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

const HOMEPAGE_IDS = [
  '135d00c5c809804185f5eb3f09667469',
  '128d00c5c809802fa74ef390708c9afe',
];

async function getPtForPage(page) {
  const parent = page.parent;
  if (parent?.type === 'workspace') return 'TBP';
  if (parent?.type === 'page_id') {
    const pid = parent.page_id.replace(/-/g, '');
    if (pid === '135d00c5c809804185f5eb3f09667469') return 'GTS';
    if (pid === '128d00c5c809802fa74ef390708c9afe') return 'TBP';
  }
  return 'TBP';
}

function getTitle(props) {
  if (!props) return 'Untitled';
  for (const key in props) {
    if (props[key].type === 'title') return props[key].title?.[0]?.plain_text || 'Untitled';
  }
  return 'Untitled';
}

async function databaseToMarkdown(dbId, dbTitle) {
  try {
    const rows = await notion.databases.query({ database_id: dbId, page_size: 100 });
    if (rows.results.length === 0) return '';
    const firstRow = rows.results[0];
    const props = firstRow.properties;
    const columns = Object.keys(props).filter(k => {
      const t = props[k].type;
      return ['title','rich_text','select','multi_select','date','checkbox','number','status'].includes(t);
    });
    if (columns.length === 0) return '';
    let md = '### ' + dbTitle + '\n\n';
    md += '| ' + columns.join(' | ') + ' |\n';
    md += '| ' + columns.map(() => '---').join(' | ') + ' |\n';
    for (const row of rows.results) {
      const p = row.properties;
      const cells = columns.map(col => {
        const prop = p[col]; if (!prop) return '-';
        try {
          if (prop.type === 'title') return prop.title?.[0]?.plain_text || '-';
          if (prop.type === 'rich_text') return prop.rich_text?.[0]?.plain_text || '-';
          if (prop.type === 'select') return prop.select?.name || '-';
          if (prop.type === 'status') return prop.status?.name || '-';
          if (prop.type === 'multi_select') return prop.multi_select?.map(s => s.name).join(', ') || '-';
          if (prop.type === 'date') return prop.date?.start || '-';
          if (prop.type === 'checkbox') return prop.checkbox ? 'Ya' : 'Tidak';
          if (prop.type === 'number') return String(prop.number ?? '-');
        } catch(e) { return '-'; }
        return '-';
      });
      md += '| ' + cells.map(c => String(c).replace(/\|/g,'\\|').replace(/\n/g,' ').trim()).join(' | ') + ' |\n';
    }
    return md + '\n';
  } catch(e) { console.warn('  Warning DB', dbId, e.message); return ''; }
}

async function getPageContent(pageId) {
  try {
    const mdblocks = await n2m.pageToMarkdown(pageId);
    let md = n2m.toMarkdownString(mdblocks).parent || '';
    const blocks = await notion.blocks.children.list({ block_id: pageId });
    const dbBlocks = blocks.results.filter(b => b.type === 'child_database');
    for (const db of dbBlocks) {
      const dbTitle = db.child_database?.title || 'Data';
      console.log('  DB found:', dbTitle);
      const dbMd = await databaseToMarkdown(db.id, dbTitle);
      if (dbMd) md += '\n\n' + dbMd;
    }
    return md.trim() || '*No content*';
  } catch(e) { return '*No content*'; }
}

async function main() {
  console.log('Starting migration v2...');
  const pagesResp = { results: [] };
  const dbResp = { results: [] };
  
  let hasMorePages = true;
  let nextCursorPages = undefined;
  while (hasMorePages) {
    const resp = await notion.search({
      filter: { property: 'object', value: 'page' },
      start_cursor: nextCursorPages
    });
    pagesResp.results.push(...resp.results);
    hasMorePages = resp.has_more;
    nextCursorPages = resp.next_cursor;
  }

  let hasMoreDbs = true;
  let nextCursorDbs = undefined;
  while (hasMoreDbs) {
    const resp = await notion.search({
      filter: { property: 'object', value: 'database' },
      start_cursor: nextCursorDbs
    });
    dbResp.results.push(...resp.results);
    hasMoreDbs = resp.has_more;
    nextCursorDbs = resp.next_cursor;
  }
  console.log('Pages:', pagesResp.results.length, 'DBs:', dbResp.results.length);
  
  for (const page of pagesResp.results) {
    const notionId = page.id;
    if (HOMEPAGE_IDS.includes(notionId.replace(/-/g,''))) continue;
    const props = page.properties;
    const title = getTitle(props);
    const pt = await getPtForPage(page);
    const coverImage = page.cover ? (page.cover.type==='external' ? page.cover.external.url : page.cover.file?.url) : null;
    console.log('Page:', title, '[' + pt + ']');
    const content = await getPageContent(notionId);
    const payload = { title, notionId, department: 'Prep & Lab', category: 'INFO::1', tags: [], coverImage, content, originalCreatedAt: page.created_time, authorNik: 'SYSTEM', authorName: 'Notion Import', pt };
    const res = await fetch('http://localhost:3000/api/bulletin/migrate-notion', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    if (res.ok) console.log('  OK:', title); else console.error('  FAIL:', title, await res.text());
  }
  
  for (const db of dbResp.results) {
    const dbId = db.id;
    if (HOMEPAGE_IDS.includes(dbId.replace(/-/g,''))) continue;
    const title = db.title?.[0]?.plain_text || 'Untitled DB';
    const pt = await getPtForPage(db);
    console.log('DB:', title, '[' + pt + ']');
    const content = await databaseToMarkdown(dbId, title);
    if (!content) { console.log('  Skipped (empty)'); continue; }
    const payload = { title, notionId: dbId, department: 'Prep & Lab', category: 'INFO::1', tags: [], coverImage: null, content, originalCreatedAt: db.created_time, authorNik: 'SYSTEM', authorName: 'Notion Import', pt };
    const res = await fetch('http://localhost:3000/api/bulletin/migrate-notion', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    if (res.ok) console.log('  OK DB:', title); else console.error('  FAIL DB:', title);
  }
  
  console.log('Done!');
}

main().catch(console.error);
