import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { appSettings, quizQuestions } from './src/db/schema.js';

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME
});

const db = drizzle(pool);

async function main() {
  const allQs = await db.select().from(quizQuestions);
  
  const settings = await db.select().from(appSettings);
  const quizConfig = settings.find(s => s.settingKey === 'QUIZ_CONFIG');
  
  const quizSettings = JSON.parse(quizConfig.settingValue);
  
  const grouped = {};
  allQs.forEach(q => {
    if (!grouped[q.category]) grouped[q.category] = [];
    grouped[q.category].push(q);
  });
  
  let selectedIds = [];
  Object.keys(quizSettings.counts).forEach(cat => {
    const count = quizSettings.counts[cat];
    const catQs = grouped[cat] || [];
    const shuffled = catQs.sort(() => 0.5 - Math.random());
    const picked = shuffled.slice(0, count).map(q => q.id);
    selectedIds = [...selectedIds, ...picked];
  });
  
  console.log("Selected IDs:", selectedIds);
  process.exit(0);
}
main().catch(console.error);
