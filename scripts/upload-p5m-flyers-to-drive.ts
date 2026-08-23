import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { db } from '../src/db/index.js';
import { p5mMateri } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const ROOT_FOLDER_ID = '1JJZKj7X1vsNNP5dTWDYJ_-0xYVhU0Bu7'; // Shared Drive root folder

const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
auth.setCredentials({ refresh_token: REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth });

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'p5m');

async function getOrCreateP5MFolder(): Promise<string> {
  const folderName = 'P5M_Materi_Flyers';
  const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${ROOT_FOLDER_ID}' in parents and trashed=false`;
  const searchRes = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true
  });

  if (searchRes.data.files && searchRes.data.files.length > 0) {
    return searchRes.data.files[0].id!;
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

  return createRes.data.id!;
}

async function uploadSingleFile(row: any, targetFolderId: string, idx: number, total: number) {
  try {
    if (!row.fileUrl || !row.fileUrl.startsWith('/uploads/p5m/')) {
      return { success: false, reason: 'no-local-file', title: row.judul };
    }

    const cleanPath = row.fileUrl.replace(/^\//, '');
    const localFilePath = path.join(process.cwd(), 'public', cleanPath);

    if (!fs.existsSync(localFilePath)) {
      return { success: false, reason: 'file-not-found', title: row.judul };
    }

    const fileName = `P5M_${row.judul.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;

    // Check if file already exists in Drive folder
    const searchRes = await drive.files.list({
      q: `name='${fileName}' and '${targetFolderId}' in parents and trashed=false`,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });

    let driveFileId = '';
    if (searchRes.data.files && searchRes.data.files.length > 0) {
      driveFileId = searchRes.data.files[0].id!;
      console.log(`[${idx + 1}/${total}] 🔁 Sudah ada di Drive: ${row.judul} (ID: ${driveFileId})`);
    } else {
      const driveUploadRes = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [targetFolderId]
        },
        media: {
          mimeType: 'image/png',
          body: fs.createReadStream(localFilePath)
        },
        fields: 'id, webViewLink',
        supportsAllDrives: true
      });
      driveFileId = driveUploadRes.data.id!;
      console.log(`[${idx + 1}/${total}] ☁️ Diupload ke Drive: ${row.judul} (ID: ${driveFileId})`);

      // Set public reader permission
      try {
        await drive.permissions.create({
          fileId: driveFileId,
          requestBody: {
            role: 'reader',
            type: 'anyone'
          },
          supportsAllDrives: true
        });
      } catch (permErr: any) {
        // Ignore if permission inherited
      }
    }

    // Google Drive direct view URL
    const driveUrl = `https://drive.google.com/uc?export=view&id=${driveFileId}`;

    // Update SQL database with the permanent Google Drive URL
    await db.update(p5mMateri).set({
      fileUrl: driveUrl
    }).where(eq(p5mMateri.id, row.id));

    return { success: true, title: row.judul, driveUrl };
  } catch (err: any) {
    console.error(`❌ [${idx + 1}/${total}] Error upload '${row.judul}':`, err.message);
    return { success: false, reason: err.message, title: row.judul };
  }
}

async function main() {
  console.log('🚀 Memulai upload seluruh flyer materi P5M ke Google Drive...');

  const targetFolderId = await getOrCreateP5MFolder();
  console.log('📁 Google Drive Target Folder ID:', targetFolderId);

  // Get all P5M materi rows from SQL
  const rows = await db.select().from(p5mMateri);
  console.log(`📑 Ditemukan ${rows.length} materi di database SQL.`);

  const BATCH_SIZE = 5;
  let successCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((row, bIdx) => uploadSingleFile(row, targetFolderId, i + bIdx, rows.length))
    );
    for (const r of results) {
      if (r.success) successCount++;
      else skippedCount++;
    }
  }

  console.log(`\n🎉 Upload ke Google Drive & Update SQL Selesai!`);
  console.log(`✅ Berhasil diunggah ke Google Drive & terhubung ke SQL: ${successCount} materi`);
  console.log(`⚠️ Dilewati / Gagal: ${skippedCount}`);
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error in Google Drive upload:', err);
  process.exit(1);
});
