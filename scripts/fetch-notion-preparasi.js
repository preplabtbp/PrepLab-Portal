import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const NOTION_TOKEN = process.env.NOTION_API_KEY;

async function fetchBlockChildren(blockId) {
  const res = await fetch(`https://api.notion.com/v1/blocks/${blockId}/children?page_size=100`, {
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
    }
  });
  return res.json();
}

function extractTextFromBlocks(blocks, depth = 0) {
  let result = '';
  const indent = '  '.repeat(depth);

  for (const block of blocks) {
    const type = block.type;
    let text = '';

    if (block[type]?.rich_text) {
      text = block[type].rich_text.map(t => t.plain_text).join('');
    }

    if (type === 'numbered_list_item') {
      result += `${indent}${depth + 1}. ${text}\n`;
    } else if (type === 'bulleted_list_item') {
      result += `${indent}- ${text}\n`;
    } else if (type === 'paragraph') {
      if (text) result += `${indent}${text}\n\n`;
    } else if (type === 'heading_1') {
      result += `\n# ${text}\n`;
    } else if (type === 'heading_2') {
      result += `\n## ${text}\n`;
    } else if (type === 'heading_3') {
      result += `\n### ${text}\n`;
    }

    if (block.has_children && !['column_list', 'child_database', 'child_page'].includes(type)) {
      // We'll handle this recursively below
    }
  }
  return result;
}

async function fetchPageContent(pageId) {
  const data = await fetchBlockChildren(pageId);
  if (!data.results) return '';

  let content = '';
  for (const block of data.results) {
    const type = block.type;
    let text = '';

    if (block[type]?.rich_text) {
      text = block[type].rich_text.map(t => t.plain_text).join('');
    }

    if (type === 'numbered_list_item') {
      content += `- ${text}\n`;
    } else if (type === 'bulleted_list_item') {
      content += `- ${text}\n`;
    } else if (type === 'paragraph') {
      if (text) content += `${text}\n\n`;
    } else if (type === 'heading_1') {
      content += `\n# ${text}\n`;
    } else if (type === 'heading_2') {
      content += `\n## ${text}\n`;
    } else if (type === 'heading_3') {
      content += `\n### ${text}\n`;
    } else if (type === 'column_list') {
      // fetch columns
      const cols = await fetchBlockChildren(block.id);
      if (cols.results) {
        for (const col of cols.results) {
          if (col.type === 'column') {
            const colData = await fetchBlockChildren(col.id);
            if (colData.results) {
              for (const cb of colData.results) {
                const ct = cb.type;
                let ctxt = '';
                if (cb[ct]?.rich_text) ctxt = cb[ct].rich_text.map(t => t.plain_text).join('');
                if (ctxt) content += `${ctxt}\n`;
              }
            }
          }
        }
      }
    }

    // handle nested items
    if (block.has_children && !['column_list', 'child_database', 'child_page', 'column'].includes(type)) {
      const childData = await fetchBlockChildren(block.id);
      if (childData.results) {
        for (const child of childData.results) {
          const ct = child.type;
          let ctxt = '';
          if (child[ct]?.rich_text) ctxt = child[ct].rich_text.map(t => t.plain_text).join('');
          if (ctxt) content += `  ${ctxt}\n`;
        }
      }
    }
  }
  return content.trim();
}

// The two RULES pages from Notion PREPARASI
const RULES_PAGES = [
  { 
    notionId: '12ad00c5-c809-80a7-938d-fc5d40165e44', 
    title: 'PENGANGKUTAN REMAINDER' 
  },
  { 
    notionId: '12cd00c5-c809-80a1-9335-c3da7339eb5d', 
    title: 'PENGERJAAN BATUAN/BOULDER PADA SAMPLE PRODUKSI TYPE LIM/SAP/BLEND' 
  },
];

// INFO pages that might be missing: Archived
const INFO_PAGES = [
  {
    notionId: '12cd00c5-c809-8080-916d-c7dae49b81f3',
    title: 'Archived'
  }
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

for (const p of [...RULES_PAGES, ...INFO_PAGES]) {
  console.log(`\nFetching: "${p.title}" (${p.notionId})`);
  
  // Check if already in DB
  const existing = await pool.query(
    "SELECT id, title FROM bulletin_posts WHERE notion_id = $1",
    [p.notionId]
  );
  
  const content = await fetchPageContent(p.notionId);
  console.log(`Content preview: ${content.substring(0, 200)}`);
  
  if (existing.rows.length > 0) {
    console.log(`EXISTS (id=${existing.rows[0].id}) - updating content...`);
    await pool.query(
      "UPDATE bulletin_posts SET content = $1, title = $2 WHERE notion_id = $3",
      [`### ${p.title}\n\n${content}`, p.title, p.notionId]
    );
    console.log(`Updated id=${existing.rows[0].id}`);
  } else {
    console.log(`INSERTING new post...`);
    const ins = await pool.query(
      `INSERT INTO bulletin_posts (pt, universe, department, category, title, content, notion_id, author_name, author_nik)
       VALUES ('TBP', 'TBP_GPS', 'Prep & Lab', 'INFO::1', $1, $2, $3, 'System', '00000000000')
       RETURNING id`,
      [p.title, `### ${p.title}\n\n${content}`, p.notionId]
    );
    console.log(`Inserted with id=${ins.rows[0].id}`);
  }
}

pool.end();
console.log('\nDone!');
