import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const NOTION_TOKEN = process.env.NOTION_API_KEY;
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
  return res.json();
}

async function databaseToMarkdown(dbId, dbTitle) {
  const dbInfo = await fetchNotion(`https://api.notion.com/v1/databases/${dbId}`);
  const rowsRes = await fetchNotion(`https://api.notion.com/v1/databases/${dbId}/query`, {
    method: 'POST',
    body: JSON.stringify({ page_size: 100 })
  });
  const rows = rowsRes.results || [];

  const propNames = Object.keys(dbInfo.properties || {});
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

  function getVal(prop) {
    if (!prop) return '-';
    switch (prop.type) {
      case 'title': return prop.title?.map(t => t.plain_text).join('').replace(/\|/g, '/') || '-';
      case 'rich_text': return prop.rich_text?.map(t => t.plain_text).join('').replace(/\|/g, '/') || '-';
      case 'number': return prop.number !== null && prop.number !== undefined ? String(prop.number) : '-';
      case 'select': return prop.select?.name?.replace(/\|/g, '/') || '-';
      case 'date': return prop.date?.start ? (prop.date.end ? `${prop.date.start} ~ ${prop.date.end}` : prop.date.start) : '-';
      case 'created_time': return new Date(prop.created_time).toISOString().replace('T', ' ').substring(0, 16);
      default: return '-';
    }
  }

  let md = `### ${dbTitle}\n\n`;
  md += `| ${sortedHeaders.join(' | ')} |\n`;
  md += `| ${sortedHeaders.map(() => '---').join(' | ')} |\n`;

  for (const row of rows) {
    const cellVals = sortedHeaders.map(h => {
      const val = getVal(row.properties[h]);
      return val.trim() === '' ? '-' : val.trim().replace(/\n/g, ' ');
    });
    md += `| ${cellVals.join(' | ')} |\n`;
  }
  return md;
}

const archivedContent = await databaseToMarkdown('12bd00c5-c809-80bf-b3be-d30cef80e96c', 'Archived Preparasi');
await pool.query(
  "UPDATE bulletin_posts SET content = $1, title = 'Archived Preparasi' WHERE id = 634",
  [archivedContent]
);
console.log('Archived Preparasi updated on ID 634');

pool.end();
