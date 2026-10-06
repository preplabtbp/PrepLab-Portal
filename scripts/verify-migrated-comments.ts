import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local' });
dotenv.config();

const { Client } = pg;

async function check() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const totalComments = await client.query(`
    SELECT count(*) as total,
           count(CASE WHEN file_url IS NOT NULL AND file_url != '' THEN 1 END) as with_files,
           count(CASE WHEN topic_id IS NOT NULL THEN 1 END) as topic_comments
    FROM bulletin_comments
  `);

  console.log('Total Comments in bulletin_comments:', totalComments.rows[0]);

  const sampleWithFiles = await client.query(`
    SELECT id, post_id, topic_id, author_name, file_url, created_at
    FROM bulletin_comments
    WHERE file_url IS NOT NULL AND file_url != ''
    ORDER BY id DESC
    LIMIT 5
  `);

  console.log('Sample comments with file attachments:');
  sampleWithFiles.rows.forEach(r => {
    console.log(`- Comment #${r.id} on Post ${r.post_id} [Topic: ${r.topic_id}] by ${r.author_name}:`);
    console.log(`  File URL: ${r.file_url}`);
  });

  const checkDbStorage = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'bulletin_comments'
  `);
  console.log('\nColumn types in bulletin_comments:');
  checkDbStorage.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

  await client.end();
}

check().catch(console.error);
