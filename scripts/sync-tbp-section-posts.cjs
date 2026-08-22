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

async function syncTarget(postId, pageId, client) {
  try {
    console.log(`Syncing ID: ${postId} (${pageId})...`);
    const mdblocks = await n2m.pageToMarkdown(pageId);
    let md = n2m.toMarkdownString(mdblocks).parent || '';

    const blocks = await notion.blocks.children.list({ block_id: pageId });
    const dbBlocks = blocks.results.filter(b => b.type === 'child_database');

    for (const db of dbBlocks) {
      const dbTitle = db.child_database?.title || 'Database';
      const rows = await notion.databases.query({
        database_id: db.id,
        page_size: 100
      });

      if (rows.results.length > 0) {
        const firstRow = rows.results[0];
        const props = firstRow.properties;
        const columns = Object.keys(props).filter(k => {
          const t = props[k].type;
          return ['title', 'rich_text', 'select', 'multi_select', 'date', 'checkbox', 'number', 'status'].includes(t);
        });

        let tableMd = '### ' + dbTitle + '\n\n';
        tableMd += '| ' + columns.join(' | ') + ' |\n';
        tableMd += '| ' + columns.map(() => '---').join(' | ') + ' |\n';

        for (const row of rows.results) {
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

          tableMd += '| ' + cells.map(c => String(c).replace(/\|/g, '\\|').replace(/\n/g, ' • ').trim()).join(' | ') + ' |\n';
        }

        md += '\n\n' + tableMd;
      }
    }

    if (md.trim().length > 0) {
      await client.query(`
        UPDATE bulletin_posts
        SET content = $1, universe = 'TBP_GPS', pt = 'TBP'
        WHERE id = $2
      `, [md.trim(), postId]);
      console.log(`  ✓ Updated ID ${postId}, len: ${md.trim().length}`);
    }
  } catch (err) {
    console.error(`  ✗ Error ID ${postId}:`, err.message);
  }
}

async function main() {
  const client = await pool.connect();
  
  const targets = [
    { id: 541, pageId: '12ad00c5-c809-81a2-a917-ed8d5abbb3e8' }, // Daily Lab
    { id: 542, pageId: '12ad00c5-c809-8159-96c3-f661b0afb522' }, // Weekly Lab
    { id: 543, pageId: '12ad00c5-c809-8158-a773-e767e82e06d3' }, // Monthly Lab
    { id: 545, pageId: '12cd00c5-c809-8058-858a-eef7e580e77f' }, // Quarterly Lab
    { id: 564, pageId: '12ad00c5-c809-81bc-92c5-d3afc21d333b' }, // Biannual Lab
    { id: 549, pageId: '12ad00c5-c809-8113-9351-d07cb243a0ec' }, // Yearly Lab
    { id: 576, pageId: '198d00c5-c809-8078-8991-cb2ba590428b' }, // Info Lab
    { id: 517, pageId: '12ad00c5-c809-81c8-8dfc-e09210c441c0' }, // Non Routine Admin
    { id: 518, pageId: '12ad00c5-c809-8117-91a0-e2b2605b7661' }, // Daily Admin
    { id: 519, pageId: '12ad00c5-c809-81e8-a159-f2e3089d71b8' }, // Weekly Admin
    { id: 520, pageId: '12ad00c5-c809-81cf-bfeb-ff64eb42ef35' }, // Monthly Admin
  ];

  for (const t of targets) {
    await syncTarget(t.id, t.pageId, client);
  }

  client.release();
  await pool.end();
}

main().catch(console.error);
