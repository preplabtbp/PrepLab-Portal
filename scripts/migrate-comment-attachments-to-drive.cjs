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

async function getDriveToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    })
  });
  const data = await res.json();
  return data.access_token;
}

async function uploadToDrive(token, buffer, mimeType, filename, folderId) {
  const metadata = {
    name: filename,
    parents: [folderId]
  };
  
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const close_delim = `\r\n--${boundary}--\r\n`;
  
  const multipartRequestBody = Buffer.concat([
    Buffer.from(delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n'),
    Buffer.from(JSON.stringify(metadata)),
    Buffer.from(delimiter + `Content-Type: ${mimeType}\r\n\r\n`),
    buffer,
    Buffer.from(close_delim)
  ]);
  
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink&supportsAllDrives=true', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody
  });
  
  const data = await res.json();
  if (!res.ok) {
    throw new Error(JSON.stringify(data));
  }

  // Set permission to anyone with link
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions?supportsAllDrives=true`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' })
    });
  } catch(e) {}

  return data;
}

function getMimeType(filename, category) {
  const lower = (filename || '').toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (lower.endsWith('.xls')) return 'application/vnd.ms-excel';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.doc')) return 'application/msword';
  if (category === 'image') return 'image/jpeg';
  return 'application/octet-stream';
}

function extractFilename(url, defaultName) {
  try {
    const cleanUrl = url.split('?')[0];
    const parts = cleanUrl.split('/');
    const rawName = decodeURIComponent(parts[parts.length - 1]);
    return rawName || defaultName;
  } catch (e) {
    return defaultName;
  }
}

async function main() {
  const client = await pool.connect();
  let token = await getDriveToken();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  console.log('=== Migrating Notion Comment Attachments to Google Drive ===');
  console.log('Target Google Drive Folder ID:', folderId);

  const dbId = '12cd00c5-c809-80fb-b98b-cd89bcecd283';
  const rows = await notion.databases.query({ database_id: dbId, page_size: 100 });

  let totalProcessed = 0;
  let totalUploaded = 0;

  for (const row of rows.results) {
    const props = row.properties;
    const title = Object.values(props).find(p => p.type === 'title')?.title?.[0]?.plain_text || 'Untitled';
    const comments = await notion.comments.list({ block_id: row.id });

    for (const c of comments.results) {
      if (!c.attachments || c.attachments.length === 0) continue;

      const commentText = c.rich_text?.map(t => t.plain_text).join('').trim() || '';
      const createdAt = c.created_time ? new Date(c.created_time) : new Date();

      console.log(`\nProcessing topic "${title}" comment (${c.attachments.length} attachments)...`);
      
      const uploadedAttachments = [];

      for (let i = 0; i < c.attachments.length; i++) {
        const att = c.attachments[i];
        const s3Url = att.file?.url;
        if (!s3Url) continue;

        const originalName = extractFilename(s3Url, `attachment_${i + 1}`);
        const cleanName = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${originalName}`;
        const mimeType = getMimeType(originalName, att.category);

        try {
          console.log(`- Downloading: ${originalName} (${mimeType})...`);
          const imgRes = await fetch(s3Url);
          if (!imgRes.ok) {
            console.error(`  Failed to download from Notion S3: HTTP ${imgRes.status}`);
            continue;
          }
          const arrayBuffer = await imgRes.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          console.log(`  Uploading ${buffer.length} bytes to Google Drive as "${cleanName}"...`);
          const driveFile = await uploadToDrive(token, buffer, mimeType, cleanName, folderId);
          
          const isImage = mimeType.startsWith('image/');
          const directUrl = isImage 
            ? `https://lh3.googleusercontent.com/d/${driveFile.id}` 
            : driveFile.webViewLink;

          uploadedAttachments.push({
            id: driveFile.id,
            name: originalName,
            category: att.category || (isImage ? 'image' : 'file'),
            mimeType,
            size: buffer.length,
            driveViewUrl: driveFile.webViewLink,
            driveDownloadUrl: driveFile.webContentLink,
            directUrl: directUrl
          });

          totalUploaded++;
        } catch (err) {
          console.error(`  Error uploading attachment ${originalName}:`, err.message);
          // Refresh token if expired
          try {
            token = await getDriveToken();
          } catch(e) {}
        }
      }

      if (uploadedAttachments.length > 0) {
        const primaryAttachment = uploadedAttachments[0];
        const attachmentsJson = JSON.stringify(uploadedAttachments);

        // Update existing matching comment in database
        const updateRes = await client.query(`
          UPDATE bulletin_comments
          SET 
            file_url = $1,
            file_name = $2
          WHERE post_id = 535 AND topic_title = $3 AND (content = $4 OR created_at = $5)
        `, [
          attachmentsJson,
          primaryAttachment.name,
          title,
          commentText,
          createdAt
        ]);

        console.log(`  ✓ Updated comment in DB with ${uploadedAttachments.length} Google Drive attachments (Rows affected: ${updateRes.rowCount})`);
        totalProcessed++;
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`Migration complete!`);
  console.log(`- Comments with attachments updated: ${totalProcessed}`);
  console.log(`- Files uploaded to Google Drive: ${totalUploaded}`);
  console.log(`========================================`);

  client.release();
  await pool.end();
}

main().catch(console.error);
