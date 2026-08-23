const { google } = require('googleapis');
require('dotenv').config();

const auth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);
auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth });

const ROOT_FOLDER_ID = '1h6JyzsouOtSNm7tukRS1JEIeB-t4mYlv';

async function listFolder(folderId, depth = 0) {
  const query = `'${folderId}' in parents and trashed=false`;
  const res = await drive.files.list({
    q: query,
    fields: 'files(id, name, mimeType, size, webViewLink)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    pageSize: 1000
  });

  const files = res.data.files || [];
  const indent = '  '.repeat(depth);

  for (const f of files) {
    if (f.mimeType === 'application/vnd.google-apps.folder') {
      console.log(`${indent}📁 [FOLDER] ${f.name} (ID: ${f.id})`);
      await listFolder(f.id, depth + 1);
    } else {
      console.log(`${indent}📄 [FILE] ${f.name} (ID: ${f.id}, size: ${f.size})`);
    }
  }
}

async function main() {
  console.log(`=== SCANNING DRIVE FOLDER ${ROOT_FOLDER_ID} ===\n`);
  await listFolder(ROOT_FOLDER_ID);
}

main().catch(console.error);
