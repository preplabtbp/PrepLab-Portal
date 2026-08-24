import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const NOTION_TOKEN = process.env.NOTION_API_KEY;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const PREPARASI_ITEMS = [
  { type: 'hub', title: 'PREPARASI', notionId: 'ff31eeec-6f81-4c6d-a5c7-2bd7e31f53f3' },
  { type: 'info', title: 'Non Routine Preparasi', notionId: '12ad00c5-c809-8191-9596-c5fba3c1402c', dbId: '12bd00c5-c809-8011-8799-d72221083ea1' },
  { type: 'info', title: 'Daily Preparasi', notionId: '12ad00c5-c809-81fd-bb57-ec2adf0d4942', dbId: '12bd00c5-c809-8049-b4d1-fa90888cea17' },
  { type: 'info', title: 'Weekly Preparasi', notionId: '12ad00c5-c809-81ef-999f-c65272faf2c3', dbId: '12bd00c5-c809-800d-9a9d-e307f2ec5f32' },
  { type: 'info', title: 'Monthly Preparasi', notionId: '12ad00c5-c809-8152-8fed-e14294afb13f', dbId: '12bd00c5-c809-80ac-bd37-d442f9b04cac' },
  { type: 'info', title: 'Quarterly Preparasi', notionId: '12ad00c5-c809-81fd-a8b3-fb05641ddd48', dbId: '4bbbb8af-b973-4ee2-bc29-9c40a72d9588' },
  { type: 'info', title: 'Biannual Preparasi', notionId: '12ad00c5-c809-810e-a910-c7324d27a5f9', dbId: '12bd00c5-c809-8072-95ce-ed2c40ca94d2' },
  { type: 'info', title: 'Yearly Preparasi', notionId: '12ad00c5-c809-81c4-b784-c71390f2174f', dbId: '12bd00c5-c809-80f5-a105-f0d04433fb70' },
  { type: 'info', title: 'Archived', notionId: '12cd00c5-c809-8080-916d-c7dae49b81f3', dbId: '12bd00c5-c809-80bf-b3be-d30cef80e96c' },
  { type: 'info', title: 'Information Preparasi', notionId: '198d00c5-c809-8027-8b7a-f88d6f7873d1', dbId: '198d00c5-c809-811f-ba67-e0a2ecbeec35' },
  { type: 'rule', title: 'PENGANGKUTAN REMAINDER', notionId: '12ad00c5-c809-80a7-938d-fc5d40165e44' },
  { type: 'rule', title: 'PENGERJAAN BATUAN/BOULDER PADA SAMPLE PRODUKSI TYPE LIM/SAP/BLEND', notionId: '12cd00c5-c809-80a1-9335-c3da7339eb5d' },
];

console.log('=== Checking in local DB ===');
for (const item of PREPARASI_ITEMS) {
  const byNotion = await pool.query("SELECT id, title, category, LEFT(content, 100) as cp FROM bulletin_posts WHERE pt = 'TBP' AND notion_id = $1", [item.notionId]);
  const byTitle = await pool.query("SELECT id, title, category, notion_id, LEFT(content, 100) as cp FROM bulletin_posts WHERE pt = 'TBP' AND title ILIKE $1", [`%${item.title}%`]);
  console.log(`\n[${item.type.toUpperCase()}] "${item.title}" (${item.notionId})`);
  console.log(`  By Notion ID (${byNotion.rows.length}):`, byNotion.rows);
  console.log(`  By Title (${byTitle.rows.length}):`, byTitle.rows);
}

pool.end();
