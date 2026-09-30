const { Client } = require('@notionhq/client');
const { Pool } = require('pg');
require('dotenv').config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const PAGE_ID = '102da20b-9575-45ff-ba4a-38e971c81d01';

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME
});

async function run() {
  console.log('--- Checking local DB for Maintenance posts ---');
  const client = await pool.connect();
  const dbRes = await client.query(`
    SELECT id, title, category, department, notion_id, pt, universe, length(content) as len 
    FROM bulletin_posts 
    WHERE LOWER(title) LIKE '%maintenance%' OR LOWER(category) LIKE '%maintenance%' OR LOWER(department) LIKE '%maintenance%' OR notion_id LIKE '%102da20b%'
  `);
  console.log('Local DB rows:', dbRes.rows);

  console.log('\n--- Checking Notion Page ' + PAGE_ID + ' ---');
  try {
    const page = await notion.pages.retrieve({ page_id: PAGE_ID });
    console.log('Page Title / Props:', JSON.stringify(page.properties, null, 2));
    console.log('Cover:', page.cover);
    console.log('Icon:', page.icon);

    const blocks = await notion.blocks.children.list({ block_id: PAGE_ID });
    console.log(`Child blocks count: ${blocks.results.length}`);
    for (const b of blocks.results) {
      console.log(` - Type: ${b.type}, ID: ${b.id}`);
      if (b.type === 'child_page') {
        console.log(`   Child Page Title: "${b.child_page?.title}"`);
      } else if (b.type === 'child_database') {
        console.log(`   Child Database Title: "${b.child_database?.title}"`);
      } else if (b.type === 'paragraph') {
        const text = b.paragraph?.rich_text?.map(t => t.plain_text).join('');
        if (text) console.log(`   Paragraph: ${text.slice(0, 100)}`);
      }
    }
  } catch (err) {
    console.error('Error fetching from Notion:', err.message);
  }

  client.release();
  pool.end();
}

run();
