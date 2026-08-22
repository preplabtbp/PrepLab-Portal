require('dotenv').config();

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

async function main() {
  const token = await getDriveToken();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  console.log('Querying Google Drive folder:', folderId);

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,webViewLink,webContentLink)&pageSize=100`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const data = await res.json();
  console.log(`Found ${data.files ? data.files.length : 0} files in Drive folder.`);
  if (data.files && data.files.length > 0) {
    console.table(data.files.map(f => ({ id: f.id, name: f.name, mimeType: f.mimeType })));
  }
}

main().catch(console.error);
