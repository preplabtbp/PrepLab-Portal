const { Client } = require('@notionhq/client');
const { NotionToMarkdown } = require('notion-to-md');
const { Pool } = require('pg');
require('dotenv').config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Configure n2m transformers
n2m.setCustomTransformer('child_page', async (block) => {
  if (block.child_page?.title) {
    return `\n\n📄 **[Sub-Halaman: ${block.child_page.title}]**\n\n`;
  }
  return '';
});

n2m.setCustomTransformer('child_database', async () => {
  return '';
});

// Priority column order for markdown tables matching TBP schema
const PRIORITY_ORDER = [
  'number', 'no',
  'jenis kegiatan', 'kegiatan', 'activity name', 'title', 'nama',
  'keterangan', 'description', 'remarks',
  'pic',
  'priority', 'prioritas',
  'status',
  'created time', 'created_time',
  'aktivitas', 'activity (routine/non routine)',
  'target selesai', 'due date', 'deadline',
  'aktual selesai', 'tanggal selesai', 'completion date',
  'period', 'weekly',
  'kategori', 'category', 'section'
];

function getColumnPriority(name) {
  const lower = name.toLowerCase().trim();
  const idx = PRIORITY_ORDER.findIndex(p => lower === p || lower.includes(p));
  return idx === -1 ? 999 : idx;
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
    case 'created_time': {
      const d = new Date(prop.created_time);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const h = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${day} ${h}:${min}`;
      }
      return '-';
    }
    case 'last_edited_time':
      return new Date(prop.last_edited_time).toISOString().replace('T', ' ').substring(0, 16);
    case 'people':
      return prop.people?.map(p => p.name || p.id).join(', ') || '-';
    case 'url':
      return prop.url ? `[Link](${prop.url})` : '-';
    case 'email':
      return prop.email || '-';
    case 'phone_number':
      return prop.phone_number || '-';
    default:
      return '-';
  }
}

/**
 * Normalizes Keterangan/Description to canonical interactive subtasks
 * Converts bullet points and legacy tags (Done)/(OPEN) to `- [x]` / `- [ ]`
 */
function normalizeSubtasksInText(rawText) {
  if (!rawText || rawText === '-') return '-';
  
  // Handle multiline or <br/>
  const normalized = rawText.replace(/<br\s*\/?>/gi, '\n');
  const lines = normalized.split(/\r?\n/);
  
  const processed = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';

    // Check if line is already standard checklist: - [ ] or - [x]
    if (/^[-*•]?\s*\[([ xX])\]/.test(trimmed)) {
      const isChecked = trimmed.match(/^[-*•]?\s*\[([ xX])\]/)[1].toLowerCase() === 'x';
      const cleanContent = trimmed.replace(/^[-*•]?\s*\[([ xX])\]\s*/, '').trim();
      return `- [${isChecked ? 'x' : ' '}] ${cleanContent}`;
    }

    // Check legacy done tags: e.g. "- Sukarman 8/01/2024 (Done)" or "**(Done)**"
    const legacyDone = trimmed.match(/^[-*•]?\s*(.+?)\s*(?:\*\*\(?|\(?)(Done|Closed|Close|Finish|Selesai|CL)(?:\)?\*\*|\)?)\s*$/i);
    if (legacyDone) {
      const cleanContent = legacyDone[1].replace(/^[-*•]\s*/, '').trim();
      return `- [x] ${cleanContent}`;
    }

    // Check legacy open tags: e.g. "- Rahmat 14/03/2024 (OPEN)"
    const legacyOpen = trimmed.match(/^[-*•]?\s*(.+?)\s*(?:\*\*\(?|\(?)(Open|OP|Belum|In Progress|Pending)(?:\)?\*\*|\)?)\s*$/i);
    if (legacyOpen) {
      const cleanContent = legacyOpen[1].replace(/^[-*•]\s*/, '').trim();
      return `- [ ] ${cleanContent}`;
    }

    // Check if line starts with a bullet point: "- Item" or "• Item" or "* Item"
    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      const bulletContent = bulletMatch[1].trim();
      // Does it look like a subtask item?
      return `- [ ] ${bulletContent}`;
    }

    return trimmed;
  });

  // Re-join with <br/> for clean single-line markdown table cell
  return processed.filter(Boolean).join('<br/>') || '-';
}

/**
 * Fetches all child blocks recursively or paginated
 */
async function fetchBlockChildren(blockId) {
  let allResults = [];
  let cursor = undefined;
  do {
    const res = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      start_cursor: cursor
    });
    allResults = allResults.concat(res.results || []);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return allResults;
}

/**
 * Queries all rows of a Notion database with pagination
 */
async function queryAllDatabaseRows(databaseId) {
  let allRows = [];
  let cursor = undefined;
  do {
    const res = await notion.databases.query({
      database_id: databaseId,
      page_size: 100,
      start_cursor: cursor
    });
    allRows = allRows.concat(res.results || []);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return allRows;
}

/**
 * Converts a child database into a standardized markdown table matching TBP schema
 */
async function convertDatabaseToMarkdownTable(databaseId, dbTitle) {
  const dbInfo = await notion.databases.retrieve({ database_id: databaseId });
  const rows = await queryAllDatabaseRows(databaseId);

  if (rows.length === 0) {
    return `### ${dbTitle}\n\n*Belum ada data kegiatan.*\n\n`;
  }

  // Get raw properties
  const propKeys = Object.keys(dbInfo.properties || {});

  // Identify title column (could have empty name "" in Notion)
  let titleKey = propKeys.find(k => dbInfo.properties[k]?.type === 'title') || 'Jenis Kegiatan';

  // Filter out internal Notion relations and unwanted columns
  const filteredKeys = propKeys.filter(k => {
    const t = dbInfo.properties[k]?.type;
    const lower = k.toLowerCase().trim();
    if (['parent item', 'sub-item', 'parent_item', 'sub_item'].includes(lower)) return false;
    return ['title', 'rich_text', 'select', 'multi_select', 'date', 'checkbox', 'number', 'status', 'created_time', 'people', 'url'].includes(t);
  });

  // Sort according to TBP priority order
  const sortedKeys = [...filteredKeys].sort((a, b) => {
    return getColumnPriority(a) - getColumnPriority(b);
  });

  // Display headers mapping (ensure Title column is named "Jenis Kegiatan" if empty or blank)
  const displayHeaders = sortedKeys.map(k => {
    const t = dbInfo.properties[k]?.type;
    if (t === 'title' && (!k.trim() || k.trim() === 'title')) {
      return 'Jenis Kegiatan';
    }
    return k.trim() || 'Jenis Kegiatan';
  });

  let md = `### ${dbTitle}\n\n`;
  md += '| ' + displayHeaders.join(' | ') + ' |\n';
  md += '| ' + displayHeaders.map(() => '---').join(' | ') + ' |\n';

  let rowIdx = 0;
  for (const row of rows) {
    const p = row.properties;
    const cells = sortedKeys.map(key => {
      const prop = p[key];
      let val = getPropertyValue(prop);

      // If this is Keterangan / Description column, normalize subtask checklists!
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('keterangan') || lowerKey.includes('description') || lowerKey.includes('remarks')) {
        val = normalizeSubtasksInText(val);
      }

      // If Number column is empty, provide rowIdx
      if ((lowerKey === 'number' || lowerKey === 'no') && (val === '-' || !val)) {
        val = String(rowIdx + 1);
      }

      // Escape pipes
      return String(val).replace(/\|/g, '\\|').trim();
    });

    // Generate safe task id
    const titleVal = getPropertyValue(p[titleKey]);
    const safeTitleSlug = titleVal.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30);
    const taskIdTag = ` <!--task-id:task_gts_${rowIdx}_${safeTitleSlug}-->`;

    // Append task-id tag to title cell
    const titleColIdx = sortedKeys.indexOf(titleKey);
    if (titleColIdx !== -1) {
      cells[titleColIdx] = cells[titleColIdx] + taskIdTag;
    }

    md += '| ' + cells.join(' | ') + ' |\n';
    rowIdx++;
  }

  return md + '\n';
}

/**
 * Converts a Notion page's full content (text, blocks, and child databases) into markdown
 */
async function convertPageToMarkdown(pageId, fallbackTitle = '') {
  try {
    const mdblocks = await n2m.pageToMarkdown(pageId);
    let md = n2m.toMarkdownString(mdblocks).parent || '';

    // Check for child databases inside this page
    const blocks = await fetchBlockChildren(pageId);
    const dbBlocks = blocks.filter(b => b.type === 'child_database');

    for (const db of dbBlocks) {
      const dbTitle = db.child_database?.title || fallbackTitle || 'Database';
      console.log(`    -> Extracting Child Database: "${dbTitle}" (${db.id})...`);
      const tableMd = await convertDatabaseToMarkdownTable(db.id, dbTitle);
      md += '\n\n' + tableMd;
    }

    return md.trim();
  } catch (err) {
    console.error(`    ✗ Error converting page ${pageId}:`, err.message);
    return '';
  }
}

/**
 * Upsert post into bulletin_posts
 */
async function upsertBulletinPost(client, {
  notionId,
  title,
  department,
  category = 'INFO::1',
  content,
  createdAt = new Date()
}) {
  const existing = await client.query(
    'SELECT id, title FROM bulletin_posts WHERE notion_id = $1',
    [notionId]
  );

  if (existing.rows.length > 0) {
    const id = existing.rows[0].id;
    await client.query(`
      UPDATE bulletin_posts
      SET title = $1, department = $2, category = $3, content = $4, universe = 'GTS', pt = 'GTS'
      WHERE id = $5
    `, [title, department, category, content, id]);
    console.log(`  ✓ UPDATED [ID ${id}]: "${title}" (Len: ${content.length})`);
    return id;
  } else {
    const res = await client.query(`
      INSERT INTO bulletin_posts (
        title, notion_id, department, category, content, universe, pt, author_name, author_nik, original_created_at
      ) VALUES ($1, $2, $3, $4, $5, 'GTS', 'GTS', 'System GTS', '00000000000', $6)
      RETURNING id
    `, [title, notionId, department, category, content, createdAt]);
    const id = res.rows[0].id;
    console.log(`  ✓ INSERTED [ID ${id}]: "${title}" (Len: ${content.length})`);
    return id;
  }
}

// Hub Definitions for GTS
const GTS_HUBS = [
  {
    name: 'ADMINISTRASI',
    department: 'Administrasi',
    id: '135d00c5-c809-81bd-8a38-c1240e239d7f',
    icon: '📂'
  },
  {
    name: 'LABORATORIUM',
    department: 'Laboratorium',
    id: '135d00c5-c809-812a-be94-c489ec9ec4b8',
    icon: '🔬'
  },
  {
    name: 'QUALITY ASSURANCE',
    department: 'Quality Assurance',
    id: '135d00c5-c809-8108-82b6-c3933f85284e',
    icon: '🛡️'
  },
  {
    name: 'PROSEDUR',
    department: 'Prosedur',
    id: '135d00c5-c809-8119-9f5f-cf0b0f2e7c7d',
    icon: '📑'
  },
  {
    name: 'PREPARASI',
    department: 'Preparasi',
    id: '135d00c5-c809-81a1-8d5d-e0564f0cc7b1',
    icon: '⚙️'
  },
  {
    name: 'PROJECT LAB GTS',
    department: 'Project Lab',
    id: '13ad00c5-c809-80fc-8547-e2235813b263',
    icon: '🏗️'
  },
  {
    name: 'MAINTENANCE',
    department: 'Maintenance',
    id: '135d00c5-c809-8104-b907-d6292b374b73',
    icon: '🔧'
  },
  {
    name: 'WAREHOUSE / INVENTORY CONTROL',
    department: 'Warehouse',
    id: '135d00c5-c809-8115-a7ad-d27d3ac6379b',
    icon: '📦'
  },
  {
    name: 'GENERAL ISSUE',
    department: 'General Issue',
    id: '135d00c5-c809-8181-8e54-e90ca5467710',
    icon: '📢'
  }
];

async function main() {
  console.log('===============================================================');
  console.log('🚀 MEMULAI MIGRASI UNIVERSE NOTION GTS KE SKEMA STANDAR TBP');
  console.log('===============================================================\n');

  const client = await pool.connect();

  try {
    const rootPageId = '135d00c5-c809-8041-85f5-eb3f09667469'; // PT. Gane Tambang Sentosa

    // 1. Process Central Agenda
    const centralAgendaDbId = '135d00c5-c809-81c6-be54-d9af8a40dc80';
    console.log(`\n📌 [Step 1] Migrasi Agenda Prep & Lab GTS (${centralAgendaDbId})...`);
    try {
      const agendaTableMd = await convertDatabaseToMarkdownTable(centralAgendaDbId, 'Agenda Prep & Lab GTS');
      await upsertBulletinPost(client, {
        notionId: centralAgendaDbId,
        title: 'Agenda Prep & Lab',
        department: 'General',
        category: 'AGENDA',
        content: `# 📅 Agenda Prep & Lab GTS\n\n${agendaTableMd}`
      });
    } catch (e) {
      console.error('Error migrating central agenda:', e.message);
    }

    // 2. Iterate each Hub
    for (const hub of GTS_HUBS) {
      console.log(`\n===============================================================`);
      console.log(`🏢 Memproses Hub: ${hub.name} (${hub.department})`);
      console.log(`===============================================================`);

      const hubChildren = await fetchBlockChildren(hub.id);
      const childPages = [];
      const childDbs = [];

      async function scanChildren(blocks) {
        for (const b of blocks) {
          if (b.type === 'child_page') {
            childPages.push({ id: b.id, title: b.child_page?.title });
          } else if (b.type === 'child_database') {
            childDbs.push({ id: b.id, title: b.child_database?.title });
          } else if (b.type === 'column_list' || b.type === 'column' || b.has_children) {
            const sub = await fetchBlockChildren(b.id);
            await scanChildren(sub);
          }
        }
      }

      await scanChildren(hubChildren);

      console.log(`  Ditemukan: ${childPages.length} Sub-Halaman, ${childDbs.length} Child Database`);

      // 2a. Process each child page
      const subPageLinks = [];
      for (let i = 0; i < childPages.length; i++) {
        const cp = childPages[i];
        console.log(`\n  [${i + 1}/${childPages.length}] Sub-Page: "${cp.title}" (${cp.id})`);
        
        const pageMd = await convertPageToMarkdown(cp.id, cp.title);
        const finalMd = pageMd || `### ${cp.title}\n\n*Halaman dokumentasi & SOP.*`;

        const postId = await upsertBulletinPost(client, {
          notionId: cp.id,
          title: cp.title,
          department: hub.department,
          category: 'INFO::1',
          content: finalMd
        });

        subPageLinks.push({ title: cp.title, id: postId, notionId: cp.id });
      }

      // 2b. Process any direct child databases in the hub
      for (const cdb of childDbs) {
        console.log(`\n  Child Database: "${cdb.title}" (${cdb.id})`);
        const tableMd = await convertDatabaseToMarkdownTable(cdb.id, cdb.title);
        await upsertBulletinPost(client, {
          notionId: cdb.id,
          title: cdb.title,
          department: hub.department,
          category: 'INFO::1',
          content: tableMd
        });
      }

      // 2c. Build clean corporate light overview Hub Post
      console.log(`\n  Membangun Ringkasan Navigasi Hub "${hub.name}"...`);
      let hubContent = `# ${hub.icon} ${hub.name}\n\n`;
      hubContent += `> **Departemen**: ${hub.department} (PT. Gane Tambang Sentosa)\n\n`;
      hubContent += `Selamat datang di portal informasi, prosedur, dan pelaporan kegiatan divisi **${hub.name}** PT. Gane Tambang Sentosa.\n\n`;
      
      hubContent += `## 📋 DAFTAR SUB-HALAMAN & RUTINITAS\n\n`;
      for (const sp of subPageLinks) {
        hubContent += `- 🔹 **[${sp.title}](/bulletin/GTS?postId=${sp.id})**\n`;
      }
      hubContent += `\n---\n*PrepLab Portal Corporate — PT. Gane Tambang Sentosa*`;

      await upsertBulletinPost(client, {
        notionId: hub.id,
        title: hub.name,
        department: hub.department,
        category: 'INFO::1',
        content: hubContent
      });
    }

    // 3. Build Root Page for PT. Gane Tambang Sentosa
    console.log('\n🏛️ Membangun Halaman Induk "PT. Gane Tambang Sentosa"...');
    let rootContent = `# 🏢 PT. GANE TAMBANG SENTOSA\n\n`;
    rootContent += `> **Portal Manajemen Preparasi & Laboratorium Terpadu**\n\n`;
    rootContent += `Pilih divisi kerja di bawah ini untuk melihat jadwal kegiatan, checklist subtask, SOP, dan pelaporan berkala:\n\n`;
    rootContent += `## 📁 DIVISI & SEKSI OPERASIONAL\n\n`;
    for (const hub of GTS_HUBS) {
      rootContent += `- ${hub.icon} **[${hub.name}](/bulletin/GTS?search=${encodeURIComponent(hub.name)})** — Divisi ${hub.department}\n`;
    }
    rootContent += `\n- 📅 **[Agenda Prep & Lab GTS](/bulletin/GTS?postId=${centralAgendaDbId})**\n`;
    rootContent += `\n---\n*PT. Gane Tambang Sentosa — Corporate Light Portal*`;

    await upsertBulletinPost(client, {
      notionId: rootPageId,
      title: 'PT. Gane Tambang Sentosa',
      department: 'Management',
      category: 'INFO::1',
      content: rootContent
    });

    console.log('\n===============================================================');
    console.log('✅ MIGRASI UNIVERSE GTS BERHASIL DISELESAIKAN SECARA LENGKAP!');
    console.log('===============================================================');

  } catch (err) {
    console.error('Fatal error during migration:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
