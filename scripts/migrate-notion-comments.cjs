const { Client } = require('@notionhq/client');
const { Pool } = require('pg');
require('dotenv').config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME
});

async function main() {
  const client = await pool.connect();

  // 1. Fetch all employees to create a reliable author lookup map
  const empRes = await client.query('SELECT nik, name, email FROM employees');
  const employees = empRes.rows;

  // Author mapping cache
  const userMap = {};

  async function getAuthor(userId) {
    if (!userId) return { nik: 'SYSTEM', name: 'Notion Sync' };
    if (userMap[userId]) return userMap[userId];

    try {
      const u = await notion.users.retrieve({ user_id: userId });
      const uName = u.name || 'Anonymous';
      const uEmail = u.person?.email || '';

      // Find matching employee by name or email
      const matched = employees.find(e => 
        (uEmail && e.email && e.email.toLowerCase() === uEmail.toLowerCase()) ||
        (e.name && uName && (e.name.toLowerCase().includes(uName.toLowerCase()) || uName.toLowerCase().includes(e.name.toLowerCase())))
      );

      const result = {
        nik: matched ? matched.nik : 'NOTION_' + userId.substring(0, 8),
        name: matched ? matched.name : uName
      };
      userMap[userId] = result;
      return result;
    } catch (e) {
      const result = { nik: 'NOTION_USER', name: 'Anggota Tim' };
      userMap[userId] = result;
      return result;
    }
  }

  console.log('--- Migrating comments for Post 535 (Non Routine Laboratorium) ---');
  const dbId = '12cd00c5-c809-80fb-b98b-cd89bcecd283';
  const rows = await notion.databases.query({ database_id: dbId, page_size: 100 });

  let insertedCount = 0;

  for (const row of rows.results) {
    const props = row.properties;
    const title = Object.values(props).find(p => p.type === 'title')?.title?.[0]?.plain_text || 'Untitled';
    const statusProp = Object.values(props).find(p => p.type === 'status' || p.type === 'select');
    const status = statusProp?.status?.name || statusProp?.select?.name || 'OPEN';

    const comments = await notion.comments.list({ block_id: row.id });
    
    if (comments.results.length > 0) {
      console.log(`Topic: "${title}" has ${comments.results.length} comments.`);

      for (const c of comments.results) {
        const author = await getAuthor(c.created_by?.id);
        const text = c.rich_text?.map(t => t.plain_text).join('').trim() || 'Pembaruan progres topik';
        const createdAt = c.created_time ? new Date(c.created_time) : new Date();

        // Check if comment already exists to avoid duplicates
        const existing = await client.query(`
          SELECT id FROM bulletin_comments
          WHERE post_id = 535 AND topic_title = $1 AND content = $2 AND created_at = $3
        `, [title, text, createdAt]);

        if (existing.rows.length === 0) {
          await client.query(`
            INSERT INTO bulletin_comments (
              post_id, topic_title, topic_id, section, category, status_update,
              author_nik, author_name, content, created_at, universe
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
            )
          `, [
            535,
            title,
            row.id,
            'LABORATORIUM',
            'INFO::1',
            status,
            author.nik,
            author.name,
            text,
            createdAt,
            'TBP_GPS'
          ]);
          insertedCount++;
        }
      }
    }
  }

  console.log(`\n✓ Migrated ${insertedCount} comments for Non Routine Laboratorium!`);

  // Query and print all comments currently stored for post 535
  const allPostComments = await client.query(`
    SELECT id, post_id, topic_title, author_nik, author_name, content, created_at
    FROM bulletin_comments
    WHERE post_id = 535
    ORDER BY created_at ASC
  `);
  console.log(`\nTotal comments in DB for Post 535: ${allPostComments.rows.length}`);
  console.table(allPostComments.rows);

  client.release();
  await pool.end();
}

main().catch(console.error);
