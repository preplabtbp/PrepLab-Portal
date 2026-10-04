const { google } = require('googleapis');
require('dotenv').config();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
auth.setCredentials({ refresh_token: REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth });

async function search() {
  console.log('Searching Google Drive for IK or Oven or PDF files:');
  const res = await drive.files.list({
    q: "name contains 'Oven' or name contains 'IK' or name contains 'Preparasi' or name contains 'Penggunaan'",
    fields: 'files(id, name, mimeType, size, webViewLink, parents)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    pageSize: 50
  });

  console.log(`Found ${res.data.files?.length || 0} matching files in Drive:`);
  for (const f of res.data.files || []) {
    console.log(`- [${f.id}] ${f.name} (${f.mimeType}, ${f.size} bytes) - Parent: ${f.parents?.join(',')}`);
  }
}

search().catch(console.error);
