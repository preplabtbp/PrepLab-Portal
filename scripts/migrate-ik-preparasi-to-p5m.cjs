const { Client } = require('@notionhq/client');
const { google } = require('googleapis');
const { Pool } = require('pg');
const { Readable } = require('stream');
require('dotenv').config();

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_PAGE_ID = '12bd00c5-c809-8057-8957-f015eec446ea';
const ROOT_FOLDER_ID = '1JJZKj7X1vsNNP5dTWDYJ_-0xYVhU0Bu7'; // Shared Drive root folder

const notion = new Client({ auth: NOTION_API_KEY });

const auth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);
auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth });

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME
});

function formatTitle(rawTitle) {
  // Remove leading numbers like "01. ", "1. ", "02. "
  let cleaned = rawTitle.replace(/^\d+[\.\-\s]+/g, '').trim();
  // If title doesn't start with "IK ", prepend it
  if (!cleaned.toUpperCase().startsWith('IK ')) {
    cleaned = `IK ${cleaned}`;
  }
  return cleaned;
}

async function getOrCreateFolder(folderName) {
  const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${ROOT_FOLDER_ID}' in parents and trashed=false`;
  const searchRes = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true
  });

  if (searchRes.data.files && searchRes.data.files.length > 0) {
    return searchRes.data.files[0].id;
  }

  const createRes = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [ROOT_FOLDER_ID]
    },
    fields: 'id',
    supportsAllDrives: true
  });

  return createRes.data.id;
}

async function uploadBufferToDrive(buffer, fileName, mimeType, folderId) {
  const fileStream = new Readable();
  fileStream.push(buffer);
  fileStream.push(null);

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId]
    },
    media: {
      mimeType: mimeType || 'application/pdf',
      body: fileStream
    },
    fields: 'id, name, webViewLink, webContentLink',
    supportsAllDrives: true
  });

  const fileId = res.data.id;

  // Set public permission so anyone with link can view
  try {
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      },
      supportsAllDrives: true
    });
  } catch (e) {
    console.warn(`Permission warning for ${fileName}:`, e.message);
  }

  return {
    id: fileId,
    name: res.data.name,
    viewUrl: `https://drive.google.com/uc?export=view&id=${fileId}`,
    webViewLink: res.data.webViewLink
  };
}

async function main() {
  console.log('=== STARTING IK PREPARASI MIGRATION TO P5M MATERI ===\n');
  const targetFolderId = await getOrCreateFolder('IK_Preparasi_Documents');
  console.log(`📁 Target Google Drive Folder: IK_Preparasi_Documents (ID: ${targetFolderId})\n`);

  const blocks = await notion.blocks.children.list({ block_id: NOTION_PAGE_ID, page_size: 100 });
  const client = await pool.connect();

  const results = [];

  for (const b of blocks.results) {
    if (b.type === 'toggle') {
      const toggleText = b.toggle.rich_text?.map(t => t.plain_text).join('').trim() || '';
      if (!toggleText) continue;

      console.log(`\n🔍 Processing Toggle: "${toggleText}" (${b.id})`);

      const children = await notion.blocks.children.list({ block_id: b.id, page_size: 100 });
      for (const child of children.results) {
        if (child.type === 'file' || child.type === 'pdf') {
          const fileObj = child[child.type].file || child[child.type].external;
          const fileName = (child.type === 'file' ? child.file.name : null) || `${toggleText}.pdf`;
          const fileUrl = fileObj?.url;

          if (!fileUrl) {
            console.warn(`  ⚠️ No URL found for file in "${toggleText}"`);
            continue;
          }

          console.log(`  📥 Downloading: "${fileName}"...`);
          const resp = await fetch(fileUrl);
          if (!resp.ok) {
            console.error(`  ❌ Failed to download ${fileName}: ${resp.status}`);
            continue;
          }

          const arrayBuffer = await resp.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          console.log(`  ✓ Downloaded (${buffer.length} bytes). Uploading to Google Drive as "${fileName}"...`);

          const driveUpload = await uploadBufferToDrive(buffer, fileName, 'application/pdf', targetFolderId);
          console.log(`  ☁️ Uploaded to Drive: ID ${driveUpload.id}`);

          const judulMateri = formatTitle(toggleText);
          console.log(`  📝 Materi Judul: "${judulMateri}"`);

          // Insert or Update into p5m_materi
          const checkExisting = await client.query(
            'SELECT id FROM p5m_materi WHERE notion_id = $1 OR judul ILIKE $2',
            [b.id, judulMateri]
          );

          if (checkExisting.rows.length > 0) {
            const existingId = checkExisting.rows[0].id;
            await client.query(
              `UPDATE p5m_materi 
               SET judul = $1, kategori = $2, sub_kategori = $3, divisi = $4, file_url = $5, notion_id = $6 
               WHERE id = $7`,
              [judulMateri, 'Teknis', 'Preparation', 'Preparation', driveUpload.viewUrl, b.id, existingId]
            );
            console.log(`  🔄 Updated existing p5m_materi (ID: ${existingId})`);
            results.push({ id: existingId, judul: judulMateri, fileName, driveId: driveUpload.id, status: 'UPDATED' });
          } else {
            const insertRes = await client.query(
              `INSERT INTO p5m_materi (judul, kategori, sub_kategori, divisi, file_url, notion_id) 
               VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
              [judulMateri, 'Teknis', 'Preparation', 'Preparation', driveUpload.viewUrl, b.id]
            );
            const newId = insertRes.rows[0].id;
            console.log(`  ✅ Inserted new p5m_materi (ID: ${newId})`);
            results.push({ id: newId, judul: judulMateri, fileName, driveId: driveUpload.id, status: 'INSERTED' });
          }
        }
      }
    }
  }

  client.release();
  await pool.end();

  console.log('\n========================================');
  console.log(`🎉 MIGRATION COMPLETED: ${results.length} IK Documents Processed!`);
  console.log('========================================');
  console.table(results);
}

main().catch(console.error);
