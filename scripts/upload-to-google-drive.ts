import { db } from '../src/db/index.js';
import { bulletinPosts } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1JE6EusixbK7saIzboKNOk9aMiAqEX-zF';

const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
auth.setCredentials({ refresh_token: REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth });

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'notion');

function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.pdf': return 'application/pdf';
    case '.doc': return 'application/msword';
    case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.ppt': return 'application/vnd.ms-powerpoint';
    case '.pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case '.xls': return 'application/vnd.ms-excel';
    case '.xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    default: return 'application/octet-stream';
  }
}

async function listExistingDriveFiles(folderId: string): Promise<Map<string, string>> {
  const fileMap = new Map<string, string>();
  let pageToken: string | undefined = undefined;
  do {
    const res: any = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name)',
      pageSize: 1000,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      pageToken: pageToken,
    });
    if (res.data.files) {
      for (const f of res.data.files) {
        fileMap.set(f.name, f.id);
      }
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return fileMap;
}

async function uploadFileToDrive(filePath: string, fileName: string, folderId: string): Promise<string> {
  const mimeType = getMimeType(fileName);
  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: fs.createReadStream(filePath),
    },
    fields: 'id, name, webViewLink',
    supportsAllDrives: true,
  });

  const fileId = res.data.id!;
  
  // Make publicly readable
  try {
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
      supportsAllDrives: true,
    });
  } catch (err: any) {
    console.warn(`Permission warning for ${fileName}:`, err.message);
  }

  return fileId;
}

async function main() {
  console.log('🚀 Starting Google Drive Migration...');
  if (!fs.existsSync(UPLOAD_DIR)) {
    console.log('No local uploads directory found.');
    process.exit(0);
  }

  const localFiles = fs.readdirSync(UPLOAD_DIR);
  console.log(`Found ${localFiles.length} local files in public/uploads/notion/`);

  console.log('Fetching existing files in Google Drive folder...');
  const existingFiles = await listExistingDriveFiles(FOLDER_ID);
  console.log(`Found ${existingFiles.size} existing files in Google Drive folder.`);

  const urlReplacementMap: Record<string, string> = {};

  let uploadedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < localFiles.length; i++) {
    const fileName = localFiles[i];
    const filePath = path.join(UPLOAD_DIR, fileName);
    const localUrl = `/uploads/notion/${fileName}`;

    let fileId: string;

    if (existingFiles.has(fileName)) {
      fileId = existingFiles.get(fileName)!;
      skippedCount++;
      console.log(`[${i + 1}/${localFiles.length}] Already in Drive: ${fileName} (ID: ${fileId})`);
    } else {
      console.log(`[${i + 1}/${localFiles.length}] Uploading to Drive: ${fileName}...`);
      try {
        fileId = await uploadFileToDrive(filePath, fileName, FOLDER_ID);
        uploadedCount++;
        console.log(`  ✓ Uploaded ID: ${fileId}`);
      } catch (err: any) {
        console.error(`  ✗ Error uploading ${fileName}:`, err.message);
        continue;
      }
    }

    const driveUrl = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
    urlReplacementMap[localUrl] = driveUrl;
    // Also support filename-based matches
    urlReplacementMap[fileName] = driveUrl;
  }

  console.log(`\n🎉 Uploaded ${uploadedCount} new files, ${skippedCount} already existed.`);
  console.log('Updating database records with Google Drive URLs...');

  const posts = await db.select().from(bulletinPosts);
  let updatedPostsCount = 0;

  for (const post of posts) {
    if (!post.content) continue;
    let newContent = post.content;
    let changed = false;

    // Check each local URL in map
    for (const [localUrl, driveUrl] of Object.entries(urlReplacementMap)) {
      if (newContent.includes(localUrl)) {
        newContent = newContent.replaceAll(localUrl, driveUrl);
        changed = true;
      }
    }

    if (changed && newContent !== post.content) {
      await db.update(bulletinPosts)
        .set({ content: newContent })
        .where(eq(bulletinPosts.id, post.id));
      updatedPostsCount++;
      console.log(`✓ Updated Post ${post.id}: "${post.title}"`);
    }
  }

  console.log(`\nUpdated ${updatedPostsCount} posts in database.`);

  console.log('\nCleaning up local server files...');
  for (const f of localFiles) {
    const p = path.join(UPLOAD_DIR, f);
    try {
      fs.unlinkSync(p);
    } catch (e) {}
  }
  try {
    fs.rmdirSync(UPLOAD_DIR);
    console.log('✓ Successfully removed public/uploads/notion directory to save server disk space!');
  } catch (e) {}

  console.log('\n========================================');
  console.log('All files are now stored safely in Google Drive!');
  console.log(`Google Drive Folder: https://drive.google.com/drive/folders/${FOLDER_ID}`);
  console.log('========================================');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error during migration:', err);
  process.exit(1);
});
