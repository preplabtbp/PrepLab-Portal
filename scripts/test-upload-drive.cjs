const { Client } = require('@notionhq/client');
require('dotenv').config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });

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

async function testUploadLoker() {
  const token = await getDriveToken();
  console.log('Got Drive token.');

  // Fetch locker comment
  const comments = await notion.comments.list({ block_id: '3c2d00c5-c809-8073-a4ba-c26a4fefcc7a' });
  const comment = comments.results[0];
  const attachUrl = comment.attachments[0].file.url;
  
  console.log('Downloading image from Notion S3...');
  const imgRes = await fetch(attachUrl);
  const arrayBuffer = await imgRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  console.log('Downloaded bytes:', buffer.length);

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  console.log('Uploading to Google Drive folder:', folderId);
  
  const uploaded = await uploadToDrive(token, buffer, 'image/jpeg', 'Pengecekan_Loker_Lab_2026-08-20.jpg', folderId);
  console.log('Google Drive Upload Result:', uploaded);
}

testUploadLoker().catch(console.error);
