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

const TARGET_PAGE_ID = '102da20b-9575-45ff-ba4a-38e971c81d01';

async function syncMaintenance(pageIdToSync = TARGET_PAGE_ID) {
  console.log(`\n======================================================`);
  console.log(`Starting Maintenance Sync for Notion ID: ${pageIdToSync}`);
  console.log(`======================================================`);

  const client = await pool.connect();

  try {
    // 1. Retrieve page from Notion
    console.log(`1. Fetching page metadata from Notion...`);
    const page = await notion.pages.retrieve({ page_id: pageIdToSync });
    
    let title = 'MAINTENANCE';
    if (page.properties?.title?.title?.[0]?.plain_text) {
      title = page.properties.title.title[0].plain_text.trim();
    } else if (page.properties?.Name?.title?.[0]?.plain_text) {
      title = page.properties.Name.title[0].plain_text.trim();
    }
    console.log(`✓ Page Title: "${title}"`);

    let coverUrl = null;
    if (page.cover?.type === 'external') coverUrl = page.cover.external.url;
    else if (page.cover?.type === 'file') coverUrl = page.cover.file.url;

    // 2. Convert markdown blocks
    console.log(`2. Converting page content to Markdown...`);
    const mdblocks = await n2m.pageToMarkdown(pageIdToSync);
    let md = n2m.toMarkdownString(mdblocks).parent || '';

    // 3. Inspect child blocks for subpages and databases
    console.log(`3. Inspecting child blocks & child databases...`);
    const children = await notion.blocks.children.list({ block_id: pageIdToSync, page_size: 100 });
    console.log(`   Found ${children.results.length} child blocks`);

    const childPages = children.results.filter(b => b.type === 'child_page');
    const childDatabases = children.results.filter(b => b.type === 'child_database');

    console.log(`   Child Pages: ${childPages.length}`);
    for (const cp of childPages) {
      console.log(`   - [Page] "${cp.child_page?.title}" (ID: ${cp.id})`);
    }

    console.log(`   Child Databases: ${childDatabases.length}`);
    for (const cd of childDatabases) {
      console.log(`   - [Database] "${cd.child_database?.title}" (ID: ${cd.id})`);
    }

    // 4. If child databases exist, query and append markdown tables
    for (const dbBlock of childDatabases) {
      const dbTitle = dbBlock.child_database?.title || 'Tabel Kegiatan';
      console.log(`   Querying database "${dbTitle}" (${dbBlock.id})...`);
      try {
        const queryRes = await notion.databases.query({
          database_id: dbBlock.id,
          page_size: 100
        });

        if (queryRes.results.length > 0) {
          const firstRow = queryRes.results[0];
          const props = firstRow.properties;
          const columns = Object.keys(props).filter(k => {
            const t = props[k].type;
            return ['title', 'rich_text', 'select', 'multi_select', 'date', 'checkbox', 'number', 'status'].includes(t);
          });

          // Ensure standard Notion headers order if matching
          let tableMd = `\n\n### ${dbTitle}\n\n`;
          tableMd += '| ' + columns.join(' | ') + ' |\n';
          tableMd += '| ' + columns.map(() => '---').join(' | ') + ' |\n';

          for (const row of queryRes.results) {
            const p = row.properties;
            const cells = columns.map(col => {
              const prop = p[col];
              if (!prop) return '-';
              try {
                if (prop.type === 'title') return prop.title?.[0]?.plain_text || '-';
                if (prop.type === 'rich_text') return prop.rich_text?.[0]?.plain_text || '-';
                if (prop.type === 'select') return prop.select?.name || '-';
                if (prop.type === 'status') return prop.status?.name || '-';
                if (prop.type === 'multi_select') return prop.multi_select?.map(s => s.name).join(', ') || '-';
                if (prop.type === 'date') return prop.date?.start || '-';
                if (prop.type === 'checkbox') return prop.checkbox ? 'Ya' : 'Tidak';
                if (prop.type === 'number') return String(prop.number ?? '-');
              } catch(e) {
                return '-';
              }
              return '-';
            });

            tableMd += '| ' + cells.map(c => String(c).replace(/\|/g, '\\|').replace(/\n/g, '<br/>').trim()).join(' | ') + ' |\n';
          }

          md += tableMd;
          console.log(`   ✓ Serialized ${queryRes.results.length} rows into markdown table`);
        }
      } catch (dberr) {
        console.warn(`   ⚠️ Warning querying db ${dbBlock.id}:`, dberr.message);
      }
    }

    // 5. Upsert Hub Post into bulletin_posts
    console.log(`4. Upserting post into bulletin_posts...`);
    const cleanContent = md.trim() || `# ${title}\n\nSelamat datang di Portal Informasi dan Kegiatan Maintenance PT. TBP & GPS.`;
    
    // Check if post exists by notion_id or (title and pt = 'TBP')
    const existing = await client.query(`
      SELECT id, title, pt, universe FROM bulletin_posts 
      WHERE notion_id = $1 OR (UPPER(title) = UPPER($2) AND pt = 'TBP')
    `, [pageIdToSync, title]);

    let savedId;
    if (existing.rows.length > 0) {
      savedId = existing.rows[0].id;
      await client.query(`
        UPDATE bulletin_posts 
        SET title = $1, content = $2, cover_image = COALESCE($3, cover_image),
            notion_id = $4, universe = 'TBP_GPS', pt = 'TBP', department = 'Prep & Lab', category = 'INFO::1'
        WHERE id = $5
      `, [title, cleanContent, coverUrl, pageIdToSync, savedId]);
      console.log(`✓ Updated existing Hub post [ID: ${savedId}] "${title}"`);
    } else {
      const insertRes = await client.query(`
        INSERT INTO bulletin_posts (title, content, cover_image, notion_id, universe, pt, department, category, author_name, author_nik)
        VALUES ($1, $2, $3, $4, 'TBP_GPS', 'TBP', 'Prep & Lab', 'INFO::1', 'Notion Import', '00000000000')
        RETURNING id
      `, [title, cleanContent, coverUrl, pageIdToSync]);
      savedId = insertRes.rows[0].id;
      console.log(`✓ Inserted new Hub post [ID: ${savedId}] "${title}"`);
    }

    console.log(`\n🎉 Sync successfully completed for ${title} [Post ID: ${savedId}]!`);
    return { success: true, id: savedId, title };
  } catch (err) {
    console.error(`\n❌ Sync failed:`, err.message);
    if (err.message.includes('Could not find page with ID') || err.code === 'object_not_found') {
      console.error(`\n👉 PENYEBAB: Page Notion belum di-share ke integration "Portal migratioon".`);
      console.error(`   Silakan buka link page Notion tersebut, klik titik tiga (...) di pojok kanan atas,`);
      console.error(`   lalu pilih "Connect to" / "Add connections" -> pilih "Portal migratioon".`);
    }
    return { success: false, error: err.message };
  } finally {
    client.release();
    await pool.end();
  }
}

const arg = process.argv[2];
syncMaintenance(arg || TARGET_PAGE_ID);
