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
  let pageToken = null;
  let allFiles = [];

  do {
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', `'${folderId}' in parents and trashed=false`);
    url.searchParams.set('fields', 'nextPageToken, files(id, name, mimeType, webViewLink, webContentLink)');
    url.searchParams.set('pageSize', '1000');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.files) allFiles = allFiles.concat(data.files);
    pageToken = data.nextPageToken;
  } while(pageToken);

  console.log('Total files in Google Drive folder:', allFiles.length);
  const searchTerms = ['loker', 'gambar', '044388c0', 'lock', 'puma', 'error', 'barging', 'kpi', 'epsilon'];
  for (const s of searchTerms) {
    const matches = allFiles.filter(f => f.name.toLowerCase().includes(s.toLowerCase()));
    console.log(`Matches for '${s}': ${matches.length}`, matches.slice(0, 5).map(m => ({ id: m.id, name: m.name })));
  }
}

main().catch(console.error);
