import 'dotenv/config';

const NOTION_TOKEN = process.env.NOTION_API_KEY;

async function queryNotionDatabase(dbId) {
  const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ page_size: 100 }),
  });
  return res.json();
}

async function getNotionDatabaseInfo(dbId) {
  const res = await fetch(`https://api.notion.com/v1/databases/${dbId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
    }
  });
  return res.json();
}

// Test with Non Routine Preparasi DB: 12bd00c5-c809-8011-8799-d72221083ea1
console.log('Fetching DB info:');
const info = await getNotionDatabaseInfo('12bd00c5-c809-8011-8799-d72221083ea1');
console.log('Title:', info.title?.[0]?.plain_text || 'Untitled');
console.log('Properties:', Object.keys(info.properties || {}));

console.log('\nQuerying DB rows:');
const rows = await queryNotionDatabase('12bd00c5-c809-8011-8799-d72221083ea1');
console.log('Row count:', rows.results?.length || 0);
if (rows.results && rows.results.length > 0) {
  console.log('Sample row properties:', JSON.stringify(rows.results[0].properties, null, 2));
}
