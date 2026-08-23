const { google } = require('googleapis');
const { Pool } = require('pg');
require('dotenv').config();

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

const ROOT_FOLDER_ID = '1h6JyzsouOtSNm7tukRS1JEIeB-t4mYlv';

function parseIKTitle(fileName) {
  let base = fileName.replace(/\.pdf$/i, '').trim();
  base = base.replace(/^TBP-IK-PL-[A-Za-z0-9\.\-_]+/i, '').trim();
  base = base.replace(/_?R\d+(\.\d+)?/gi, '').trim();
  base = base.replace(/^[\d\.\-_\s]+/, '').trim();
  base = base.replace(/[\d\.\-_\s]+$/, '').trim();
  base = base.replace(/^Pengoprasian\b/i, 'Pengoperasian');

  if (!base.toUpperCase().startsWith('IK ')) {
    base = `IK ${base}`;
  }
  return base;
}

async function getFolderFiles(folderId) {
  const query = `'${folderId}' in parents and trashed=false`;
  const res = await drive.files.list({
    q: query,
    fields: 'files(id, name, mimeType, webViewLink)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    pageSize: 1000
  });
  return res.data.files || [];
}

async function ensurePublicPermission(fileId) {
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
    // Already public or ignored
  }
}

async function main() {
  console.log('=== SYNCING IK DOCUMENTS FROM GOOGLE DRIVE TO P5M MATERI ===\n');
  const client = await pool.connect();

  // 1. Batalkan/hapus materi dari Notion yang diupload sebelumnya (notion_id like '12bd00c5%')
  const deleteOld = await client.query(
    "DELETE FROM p5m_materi WHERE notion_id LIKE '12bd00c5%' RETURNING id, judul"
  );
  if (deleteOld.rows.length > 0) {
    console.log(`🗑️  Dihapus ${deleteOld.rows.length} data materi IK Notion lama.`);
  }

  // 2. Baca subfolder dari ROOT_FOLDER_ID
  const rootItems = await getFolderFiles(ROOT_FOLDER_ID);
  const subFolders = rootItems.filter(f => f.mimeType === 'application/vnd.google-apps.folder');

  const processedResults = [];

  for (const folder of subFolders) {
    const isPrep = folder.name.toUpperCase().includes('PREP');
    const isLab = folder.name.toUpperCase().includes('LAB');
    const category = 'Teknis';
    const subCategory = isPrep ? 'Preparation' : isLab ? 'Laboratory' : 'General';
    const divisi = isPrep ? 'Preparation' : isLab ? 'Laboratory' : 'All';

    console.log(`📁 Scanning Folder "${folder.name}" (${subCategory})...`);
    const files = await getFolderFiles(folder.id);

    for (const file of files) {
      if (file.mimeType === 'application/pdf' || file.name.endsWith('.pdf')) {
        await ensurePublicPermission(file.id);
        const judulMateri = parseIKTitle(file.name);
        const fileUrl = `https://drive.google.com/uc?export=view&id=${file.id}`;
        const notionId = `drive_${file.id}`;

        // Cek apakah sudah ada materi dengan drive file atau judul yang sama
        const check = await client.query(
          'SELECT id FROM p5m_materi WHERE notion_id = $1 OR file_url = $2',
          [notionId, fileUrl]
        );

        if (check.rows.length > 0) {
          const existingId = check.rows[0].id;
          await client.query(
            `UPDATE p5m_materi 
             SET judul = $1, kategori = $2, sub_kategori = $3, divisi = $4, file_url = $5, notion_id = $6
             WHERE id = $7`,
            [judulMateri, category, subCategory, divisi, fileUrl, notionId, existingId]
          );
          processedResults.push({
            id: existingId,
            section: subCategory,
            judul: judulMateri,
            fileName: file.name,
            driveId: file.id,
            status: 'UPDATED'
          });
          console.log(`  🔄 [${subCategory}] Updated (ID ${existingId}): "${judulMateri}"`);
        } else {
          const insertRes = await client.query(
            `INSERT INTO p5m_materi (judul, kategori, sub_kategori, divisi, file_url, notion_id)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [judulMateri, category, subCategory, divisi, fileUrl, notionId]
          );
          const newId = insertRes.rows[0].id;
          processedResults.push({
            id: newId,
            section: subCategory,
            judul: judulMateri,
            fileName: file.name,
            driveId: file.id,
            status: 'INSERTED'
          });
          console.log(`  ✅ [${subCategory}] Inserted (ID ${newId}): "${judulMateri}"`);
        }
      }
    }
    console.log('');
  }

  client.release();
  await pool.end();

  console.log('================================================================');
  console.log(`🎉 SYNC SELESAI: ${processedResults.length} Dokumen IK Drive Berhasil Dimigrasikan!`);
  console.log('================================================================');
  console.table(processedResults);
}

main().catch(console.error);
