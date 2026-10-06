const { Client } = require('@notionhq/client');
const { NotionToMarkdown } = require('notion-to-md');
const { Pool } = require('pg');
require('dotenv').config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME
});

const MAINTENANCE_HUB_ID = '102da20b-9575-45ff-ba4a-38e971c81d01';

const SUBPAGES = [
  { 
    title: 'Non Routine Maintenance', 
    pageId: '12ad00c5-c809-8134-acb4-f5f840b68bfe', 
    dbId: '12bd00c5-c809-8062-b01b-d0c35704baaa' 
  },
  { 
    title: 'Daily Maintenance', 
    pageId: '12ad00c5-c809-81f2-a6eb-c9571d77143c', 
    dbId: '12bd00c5-c809-8068-8b21-c5be11ff085f' 
  },
  { 
    title: 'Weekly Maintenance', 
    pageId: '12ad00c5-c809-81c7-89ed-d6fd5e9f640c', 
    dbId: '12bd00c5-c809-8022-98c9-fcdb7aedc330' 
  },
  { 
    title: 'Monthly Maintenance', 
    pageId: '12ad00c5-c809-81d0-84bb-df3e8a5b5254', 
    dbId: '12bd00c5-c809-8071-8f4c-df75d86687de' 
  },
  { 
    title: 'Quarterly Maintenance', 
    pageId: '12ad00c5-c809-81b0-a195-de4f2bce4acb', 
    dbId: '12bd00c5-c809-809e-876b-e6039d911af0' 
  },
  { 
    title: 'Information Maintenance', 
    pageId: '198d00c5-c809-8049-ac89-fc0d7ca544c7', 
    dbId: '198d00c5-c809-8162-9478-e63139811608' 
  }
];

function getPropertyValue(prop) {
  if (!prop) return '-';
  switch (prop.type) {
    case 'title':
      return prop.title?.map(t => t.plain_text).join('').replace(/\|/g, '/') || '-';
    case 'rich_text':
      return prop.rich_text?.map(t => t.plain_text).join('').replace(/\|/g, '/') || '-';
    case 'number':
      return prop.number !== null && prop.number !== undefined ? String(prop.number) : '-';
    case 'select':
      return prop.select?.name?.replace(/\|/g, '/') || '-';
    case 'multi_select':
      return prop.multi_select?.map(s => s.name).join(', ').replace(/\|/g, '/') || '-';
    case 'date':
      if (!prop.date?.start) return '-';
      return prop.date.end ? `${prop.date.start} ~ ${prop.date.end}` : prop.date.start;
    case 'checkbox':
      return prop.checkbox ? '✅' : '❌';
    case 'status':
      return prop.status?.name?.replace(/\|/g, '/') || '-';
    case 'created_time':
      return new Date(prop.created_time).toISOString().replace('T', ' ').substring(0, 16);
    case 'last_edited_time':
      return new Date(prop.last_edited_time).toISOString().replace('T', ' ').substring(0, 16);
    case 'people':
      return prop.people?.map(p => p.name || p.id).join(', ') || '-';
    case 'url':
      return prop.url || '-';
    case 'email':
      return prop.email || '-';
    case 'phone_number':
      return prop.phone_number || '-';
    default:
      return '-';
  }
}

async function databaseToMarkdown(dbId, dbTitle) {
  const dbInfo = await notion.databases.retrieve({ database_id: dbId });
  
  let allRows = [];
  let cursor = undefined;
  do {
    const res = await notion.databases.query({
      database_id: dbId,
      page_size: 100,
      start_cursor: cursor
    });
    allRows = allRows.concat(res.results || []);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  const propNames = Object.keys(dbInfo.properties || {});
  
  // Canonical column order: Number, Jenis Kegiatan, Keterangan, PIC, Priority, Status, Created Time, Kategori, Activity, Period
  const canonicalOrder = [
    'number', 'no', 'jenis kegiatan', 'kegiatan', 'title', 'nama',
    'keterangan', 'content', 'catatan', 'deskripsi',
    'pic', 'assignee', 'pj',
    'priority', 'prioritas',
    'status',
    'created time', 'date', 'tanggal',
    'kategori', 'category',
    'activity', 'aktivitas',
    'period', 'periode'
  ];

  const sortedHeaders = [...propNames].sort((a, b) => {
    const idxA = canonicalOrder.findIndex(p => a.toLowerCase().includes(p));
    const idxB = canonicalOrder.findIndex(p => b.toLowerCase().includes(p));
    const scoreA = idxA === -1 ? 999 : idxA;
    const scoreB = idxB === -1 ? 999 : idxB;
    return scoreA - scoreB;
  }).filter(h => !['parent item', 'sub-item'].includes(h.toLowerCase()));

  // Build markdown table
  let md = `### ${dbTitle}\n\n`;
  md += `| ${sortedHeaders.join(' | ')} |\n`;
  md += `| ${sortedHeaders.map(() => '---').join(' | ')} |\n`;

  for (const row of allRows) {
    const cellVals = sortedHeaders.map(h => {
      const prop = row.properties[h];
      const val = getPropertyValue(prop);
      return val.trim() === '' ? '-' : val.trim().replace(/\|/g, '\\|').replace(/\n/g, '<br/>');
    });
    md += `| ${cellVals.join(' | ')} |\n`;
  }

  return { markdown: md, count: allRows.length };
}

async function upsertPost(client, { title, content, notionId, coverUrl }) {
  // Check existing post for TBP
  const existing = await client.query(
    "SELECT id FROM bulletin_posts WHERE pt = 'TBP' AND (notion_id = $1 OR (UPPER(title) = UPPER($2) AND department = 'Prep & Lab'))",
    [notionId, title]
  );

  let id;
  if (existing.rows.length > 0) {
    id = existing.rows[0].id;
    await client.query(
      `UPDATE bulletin_posts 
       SET title = $1, content = $2, category = 'INFO::1', department = 'Prep & Lab', 
           notion_id = $3, universe = 'TBP_GPS', pt = 'TBP', cover_image = COALESCE($4, cover_image)
       WHERE id = $5`,
      [title, content, notionId, coverUrl, id]
    );
    console.log(`  ✓ UPDATED [ID: ${id}] "${title}" (length: ${content.length})`);
  } else {
    const ins = await client.query(
      `INSERT INTO bulletin_posts (pt, universe, department, category, title, content, notion_id, cover_image, author_name, author_nik)
       VALUES ('TBP', 'TBP_GPS', 'Prep & Lab', 'INFO::1', $1, $2, $3, $4, 'Notion Import', '00000000000')
       RETURNING id`,
      [title, content, notionId, coverUrl]
    );
    id = ins.rows[0].id;
    console.log(`  ✓ INSERTED [ID: ${id}] "${title}" (length: ${content.length})`);
  }
  return id;
}

async function main() {
  console.log('================================================================');
  console.log('STARTING COMPLETE MAINTENANCE MODULE MIGRATION FROM NOTION');
  console.log('================================================================\n');

  const client = await pool.connect();

  try {
    // 1. Migrate all Subpages first
    console.log('--- Phase 1: Migrating Maintenance Subpages & Databases ---');
    const subpageIds = {};

    for (const sub of SUBPAGES) {
      console.log(`\nProcessing: "${sub.title}" (Page: ${sub.pageId}, DB: ${sub.dbId})`);
      
      let pageMd = '';
      try {
        const mdblocks = await n2m.pageToMarkdown(sub.pageId);
        pageMd = n2m.toMarkdownString(mdblocks).parent || '';
      } catch (e) {
        console.warn(`  Warning fetching text for ${sub.title}:`, e.message);
      }

      let dbMd = '';
      if (sub.dbId) {
        try {
          const res = await databaseToMarkdown(sub.dbId, sub.title);
          dbMd = res.markdown;
          console.log(`  ✓ Extracted ${res.count} rows from Notion Database`);
        } catch (e) {
          console.warn(`  Warning extracting DB for ${sub.title}:`, e.message);
        }
      }

      const fullContent = [pageMd.trim(), dbMd.trim()].filter(Boolean).join('\n\n') || `### ${sub.title}\n\nBelum ada rincian kegiatan.`;
      
      let coverUrl = null;
      try {
        const pageInfo = await notion.pages.retrieve({ page_id: sub.pageId });
        if (pageInfo.cover?.type === 'external') coverUrl = pageInfo.cover.external.url;
        else if (pageInfo.cover?.type === 'file') coverUrl = pageInfo.cover.file.url;
      } catch(e) {}

      const postId = await upsertPost(client, {
        title: sub.title,
        content: fullContent,
        notionId: sub.pageId,
        coverUrl
      });
      subpageIds[sub.title] = postId;
    }

    // 2. Migrate Main Hub: MAINTENANCE (102da20b-9575-45ff-ba4a-38e971c81d01)
    console.log('\n--- Phase 2: Migrating Main Hub "MAINTENANCE" ---');
    let hubMd = '';
    try {
      const mdblocks = await n2m.pageToMarkdown(MAINTENANCE_HUB_ID);
      hubMd = n2m.toMarkdownString(mdblocks).parent || '';
    } catch (e) {
      console.warn('Warning fetching hub text:', e.message);
    }

    let hubCoverUrl = null;
    try {
      const hubPage = await notion.pages.retrieve({ page_id: MAINTENANCE_HUB_ID });
      if (hubPage.cover?.type === 'external') hubCoverUrl = hubPage.cover.external.url;
      else if (hubPage.cover?.type === 'file') hubCoverUrl = hubPage.cover.file.url;
    } catch(e) {}

    // Build structured Hub content
    let structuredHubContent = `# $INFO$\n\n`;
    for (const sub of SUBPAGES) {
      structuredHubContent += `## ${sub.title}\n\n> **Menu Info Maintenance**\n\n${sub.title}\n\n`;
    }
    structuredHubContent += `\n# $RULES$\n\n## Information Maintenance\n\nInformation Maintenance\n\n`;

    const hubPostId = await upsertPost(client, {
      title: 'MAINTENANCE',
      content: structuredHubContent.trim(),
      notionId: MAINTENANCE_HUB_ID,
      coverUrl: hubCoverUrl
    });

    // 3. Link MAINTENANCE into Post 480 (PT. TBP & GPS Root Section Hub) if not present
    console.log('\n--- Phase 3: Linking MAINTENANCE to Root Hub Post 480 ---');
    const p480 = await client.query('SELECT id, content FROM bulletin_posts WHERE id = 480');
    if (p480.rows.length > 0) {
      let content480 = p480.rows[0].content || '';
      if (!content480.toUpperCase().includes('MAINTENANCE')) {
        const maintSnippet = `\n<details>\n<summary>**MAINTENANCE**</summary>\n\n[link_to_page](https://www.notion.so/${MAINTENANCE_HUB_ID})\n\n</details>\n`;
        // Insert before <details><summary>**MANAJEMEN MUTU** or before first embed
        if (content480.includes('<details>\n<summary>**MANAJEMEN MUTU**')) {
          content480 = content480.replace('<details>\n<summary>**MANAJEMEN MUTU**', maintSnippet + '\n<details>\n<summary>**MANAJEMEN MUTU**');
        } else {
          content480 += '\n' + maintSnippet;
        }
        await client.query('UPDATE bulletin_posts SET content = $1 WHERE id = 480', [content480]);
        console.log('✓ Successfully linked MAINTENANCE into Post 480 (PT. TBP & GPS)!');
      } else {
        console.log('✓ Post 480 already has MAINTENANCE link.');
      }
    }

    console.log('\n================================================================');
    console.log('🎉 MAINTENANCE MIGRATION SUCCESSFULLY FINISHED!');
    console.log(`Hub Post ID: ${hubPostId}`);
    console.log('Subpages:', subpageIds);
    console.log('================================================================\n');

  } catch (err) {
    console.error('Fatal error during migration:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
