import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const NOTION_TOKEN = process.env.NOTION_API_KEY;
const PREPARASI_PAGE_ID = 'ff31eeec6f814c6da5c72bd7e31f53f3';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fetchNotion(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
      ...options.headers,
    }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Notion API error: ${res.status} ${err}`);
  }
  return res.json();
}

async function fetchBlockChildren(blockId) {
  let allResults = [];
  let cursor = undefined;
  do {
    const url = `https://api.notion.com/v1/blocks/${blockId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`;
    const data = await fetchNotion(url);
    allResults = allResults.concat(data.results || []);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return allResults;
}

async function queryDatabase(dbId) {
  let allResults = [];
  let cursor = undefined;
  do {
    const data = await fetchNotion(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      body: JSON.stringify({
        page_size: 100,
        start_cursor: cursor,
      })
    });
    allResults = allResults.concat(data.results || []);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return allResults;
}

async function getDatabaseInfo(dbId) {
  return await fetchNotion(`https://api.notion.com/v1/databases/${dbId}`);
}

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
  const dbInfo = await getDatabaseInfo(dbId);
  const rows = await queryDatabase(dbId);

  // Preferred column order
  const propNames = Object.keys(dbInfo.properties || {});
  
  // Sort columns: Number/No first, Title/Jenis Kegiatan next, Status, Priority, PIC, Kategori, Period, Target, Aktual, Keterangan
  const priorityOrder = [
    'number', 'no', 'jenis kegiatan', 'kegiatan', 'title', 'nama', 
    'status', 'status 1', 'priority', 'prioritas', 'pic', 
    'kategori', 'period', 'aktivitas', 'target selesai', 'aktual selesai', 
    'created time', 'date', 'keterangan', 'content'
  ];

  const sortedHeaders = [...propNames].sort((a, b) => {
    const idxA = priorityOrder.findIndex(p => a.toLowerCase().includes(p));
    const idxB = priorityOrder.findIndex(p => b.toLowerCase().includes(p));
    const scoreA = idxA === -1 ? 999 : idxA;
    const scoreB = idxB === -1 ? 999 : idxB;
    return scoreA - scoreB;
  }).filter(h => !['parent item', 'sub-item'].includes(h.toLowerCase()));

  // Build markdown table
  let md = `### ${dbTitle}\n\n`;
  md += `| ${sortedHeaders.join(' | ')} |\n`;
  md += `| ${sortedHeaders.map(() => '---').join(' | ')} |\n`;

  for (const row of rows) {
    const cellVals = sortedHeaders.map(h => {
      const prop = row.properties[h];
      const val = getPropertyValue(prop);
      return val.trim() === '' ? '-' : val.trim().replace(/\n/g, ' ');
    });
    md += `| ${cellVals.join(' | ')} |\n`;
  }

  return md;
}

async function formatPageContent(blocks, depth = 0) {
  let text = '';
  for (const block of blocks) {
    const type = block.type;
    let bText = '';

    if (block[type]?.rich_text) {
      bText = block[type].rich_text.map(t => t.plain_text).join('');
    }

    if (type === 'numbered_list_item') {
      text += `- ${bText}\n`;
    } else if (type === 'bulleted_list_item') {
      text += `- ${bText}\n`;
    } else if (type === 'paragraph') {
      if (bText) text += `${bText}\n\n`;
    } else if (type === 'heading_1') {
      text += `\n# ${bText}\n\n`;
    } else if (type === 'heading_2') {
      text += `\n## ${bText}\n\n`;
    } else if (type === 'heading_3') {
      text += `\n### ${bText}\n\n`;
    } else if (type === 'callout') {
      const emoji = block.callout?.icon?.emoji || '💡';
      text += `> ${emoji} ${bText}\n\n`;
    } else if (type === 'toggle') {
      text += `<details><summary>**${bText}**</summary>\n\n`;
      if (block.has_children) {
        const childBlocks = await fetchBlockChildren(block.id);
        text += await formatPageContent(childBlocks, depth + 1);
      }
      text += `</details>\n\n`;
      continue;
    } else if (type === 'column_list') {
      const colList = await fetchBlockChildren(block.id);
      for (const col of colList) {
        if (col.type === 'column') {
          const colBlocks = await fetchBlockChildren(col.id);
          text += await formatPageContent(colBlocks, depth + 1);
        }
      }
      continue;
    }

    if (block.has_children && !['child_database', 'child_page', 'column_list', 'column', 'toggle'].includes(type)) {
      const childBlocks = await fetchBlockChildren(block.id);
      text += await formatPageContent(childBlocks, depth + 1);
    }
  }
  return text;
}

async function upsertBulletinPost({ title, content, notionId, category = 'INFO::1', department = 'Prep & Lab' }) {
  // Check if exists by notion_id or title
  const existing = await pool.query(
    "SELECT id FROM bulletin_posts WHERE pt = 'TBP' AND (notion_id = $1 OR (title = $2 AND department = $3))",
    [notionId, title, department]
  );

  if (existing.rows.length > 0) {
    const id = existing.rows[0].id;
    await pool.query(
      `UPDATE bulletin_posts 
       SET title = $1, content = $2, category = $3, department = $4, notion_id = $5 
       WHERE id = $6`,
      [title, content, category, department, notionId, id]
    );
    console.log(`  UPDATED [id=${id}]: "${title}"`);
    return id;
  } else {
    const ins = await pool.query(
      `INSERT INTO bulletin_posts (pt, universe, department, category, title, content, notion_id, author_name, author_nik)
       VALUES ('TBP', 'TBP_GPS', $1, $2, $3, $4, $5, 'System', '00000000000')
       RETURNING id`,
      [department, category, title, content, notionId]
    );
    const id = ins.rows[0].id;
    console.log(`  INSERTED [id=${id}]: "${title}"`);
    return id;
  }
}

async function migratePreparasi() {
  console.log('🚀 Starting Full Migration of Notion PREPARASI to Local PostgreSQL...');

  const pageIds = {};

  // 1. Create / Update Root PREPARASI Post
  console.log('\n1. Root PREPARASI Hub Post:');
  const hubId = await upsertBulletinPost({
    title: 'PREPARASI',
    content: `### PREPARASI\n\nSelamat datang di Portal Informasi dan Prosedur Kerja Departemen Preparasi PT. TBP & GPS.`,
    notionId: 'ff31eeec-6f81-4c6d-a5c7-2bd7e31f53f3',
    category: 'INFO::1',
  });
  pageIds['PREPARASI'] = hubId;

  // 2. Child pages & databases list
  const INFO_ITEMS = [
    { title: 'Non Routine Preparasi', pageId: '12ad00c5-c809-8191-9596-c5fba3c1402c', dbId: '12bd00c5-c809-8011-8799-d72221083ea1' },
    { title: 'Daily Preparasi', pageId: '12ad00c5-c809-81fd-bb57-ec2adf0d4942', dbId: '12bd00c5-c809-8049-b4d1-fa90888cea17' },
    { title: 'Weekly Preparasi', pageId: '12ad00c5-c809-81ef-999f-c65272faf2c3', dbId: '12bd00c5-c809-800d-9a9d-e307f2ec5f32' },
    { title: 'Monthly Preparasi', pageId: '12ad00c5-c809-8152-8fed-e14294afb13f', dbId: '12bd00c5-c809-80ac-bd37-d442f9b04cac' },
    { title: 'Quarterly Preparasi', pageId: '12ad00c5-c809-81fd-a8b3-fb05641ddd48', dbId: '4bbbb8af-b973-4ee2-bc29-9c40a72d9588' },
    { title: 'Biannual Preparasi', pageId: '12ad00c5-c809-810e-a910-c7324d27a5f9', dbId: '12bd00c5-c809-8072-95ce-ed2c40ca94d2' },
    { title: 'Yearly Preparasi', pageId: '12ad00c5-c809-81c4-b784-c71390f2174f', dbId: '12bd00c5-c809-80f5-a105-f0d04433fb70' },
    { title: 'Archived', pageId: '12cd00c5-c809-8080-916d-c7dae49b81f3', dbId: '12bd00c5-c809-80bf-b3be-d30cef80e96c' },
    { title: 'Information Preparasi', pageId: '198d00c5-c809-8027-8b7a-f88d6f7873d1', dbId: '198d00c5-c809-811f-ba67-e0a2ecbeec35' },
    { title: 'Agenda Preparasi', pageId: '12ad00c5-c809-8196-af1d-e7083de019ae', dbId: '12ad00c5-c809-8196-af1d-e7083de019ae' },
  ];

  console.log('\n2. Migrating INFO Database Tables:');
  for (const item of INFO_ITEMS) {
    try {
      console.log(`Processing "${item.title}"...`);
      let content = '';
      if (item.dbId) {
        content = await databaseToMarkdown(item.dbId, item.title);
      } else {
        const blocks = await fetchBlockChildren(item.pageId);
        content = await formatPageContent(blocks);
      }
      const id = await upsertBulletinPost({
        title: item.title,
        content: content || `### ${item.title}\n\n*Tidak ada data.*`,
        notionId: item.pageId,
      });
      pageIds[item.title] = id;
    } catch (e) {
      console.error(`  Error processing ${item.title}:`, e.message);
    }
  }

  // 3. Migrating RULES Procedures
  console.log('\n3. Migrating RULES Procedures:');
  const RULE_ITEMS = [
    { title: 'PENGANGKUTAN REMAINDER', pageId: '12ad00c5-c809-80a7-938d-fc5d40165e44' },
    { title: 'PENGERJAAN BATUAN/BOULDER PADA SAMPLE PRODUKSI TYPE LIM/SAP/BLEND', pageId: '12cd00c5-c809-80a1-9335-c3da7339eb5d' },
  ];

  for (const item of RULE_ITEMS) {
    try {
      console.log(`Processing "${item.title}"...`);
      const blocks = await fetchBlockChildren(item.pageId);
      const text = await formatPageContent(blocks);
      const content = `### ${item.title}\n\n${text}`;
      const id = await upsertBulletinPost({
        title: item.title,
        content,
        notionId: item.pageId,
      });
      pageIds[item.title] = id;
    } catch (e) {
      console.error(`  Error processing ${item.title}:`, e.message);
    }
  }

  console.log('\n🎉 Migration Complete! Page ID Mapping:');
  console.log(JSON.stringify(pageIds, null, 2));

  await pool.end();
  return pageIds;
}

await migratePreparasi();
