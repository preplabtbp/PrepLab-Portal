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

async function main() {
  const pageId = '12ad00c5-c809-8138-bbd1-c6cfbb858729';
  console.log('Fetching Notion Page:', pageId);

  const mdblocks = await n2m.pageToMarkdown(pageId);
  let md = n2m.toMarkdownString(mdblocks).parent || '';

  const blocks = await notion.blocks.children.list({ block_id: pageId });
  const dbBlocks = blocks.results.filter(b => b.type === 'child_database');

  for (const db of dbBlocks) {
    const dbTitle = db.child_database?.title || 'Non Routine Laboratorium';
    console.log('Child database found:', dbTitle, db.id);

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

  console.log('\nGenerated Markdown Preview (first 1000 chars):\n', md.substring(0, 1000));

  const client = await pool.connect();
  const updateRes = await client.query(`
    UPDATE bulletin_posts
    SET content = $1, universe = 'TBP_GPS', pt = 'TBP', category = 'INFO::1', department = 'Prep & Lab'
    WHERE id = 535
    RETURNING id, title, universe, pt, length(content) as len
  `, [md]);

  console.log('\nUpdated Post 535:', updateRes.rows[0]);

  client.release();
  await pool.end();
}

main().catch(console.error);
