const { Client } = require('@notionhq/client');
const { Pool } = require('pg');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
require('dotenv').config();

const token = process.env.NOTION_API_KEY;
console.log('Using Notion API Key:', token?.substring(0, 12) + '...');
const notion = new Client({ auth: token });

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME
});

const GDRIVE_FOLDER_ID = process.env.GDRIVE_BULLETIN_ATTACHMENTS_FOLDER_ID || '1JE6EusixbK7saIzboKNOk9aMiAqEX-zF';
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'notion');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const CACHE_FILE = path.join(__dirname, 'attachments-cache.json');
let attachmentCache = {};
if (fs.existsSync(CACHE_FILE)) {
  try {
    attachmentCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch (e) {
    attachmentCache = {};
  }
}

function saveCache() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(attachmentCache, null, 2));
  } catch (e) {}
}

// Google Drive Auth via googleapis
const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth });

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
  if (lower.endsWith('.pptx')) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  if (lower.endsWith('.ppt')) return 'application/vnd.ms-powerpoint';
  if (category === 'image') return 'image/jpeg';
  return 'application/octet-stream';
}

function sanitizeFilename(name) {
  return (name || '').replace(/[^a-zA-Z0-9._\-]/g, '_').replace(/_+/g, '_');
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

const INFO_PAGES = [
  { id: 479, title: 'INFORMATION', notionId: '12bd00c5-c809-8006-a5a8-fb55eb68f5d8' },
  { id: 483, title: 'INFORMASI IT', notionId: '12ed00c5-c809-8053-a7bd-cc6b6d5af4be' },
  { id: 484, title: 'HARITA CORE', notionId: '90603168-9c35-481d-abd2-db3f6d2401cd' },
  { id: 489, title: 'QR CODE', notionId: '5db2aeb0-4bf5-44de-aa1f-b4f57254e31b' },
  { id: 490, title: 'GOLDEN RULES', notionId: '17bd00c5-c809-8168-8ba3-dbe8e2c5f8cc' },
  { id: 491, title: '1. Golden Rules (Keselamatan di jalan tambang)', notionId: '21dd00c5-c809-805e-a9e3-f7ba66db1dcf' },
  { id: 492, title: '2. Golden Rules (Patuhi Peraturan Rambu-rambu Lalu Lintas)', notionId: '21dd00c5-c809-80b2-a396-d5acb416a383' },
  { id: 493, title: '4. Golden Rules (Isolasi, Lock Out & Zero Energy)', notionId: '223d00c5-c809-8007-8011-e60a4b43fc7c' },
  { id: 494, title: '3. Golden Rules (Pekerjaan Berisiko Tinggi)', notionId: '21dd00c5-c809-8086-835e-fdea76ef1992' },
  { id: 495, title: '5. Golden Rules (Pengankatan dan Penyanggaan)', notionId: '223d00c5-c809-80a8-9094-d0097330a4fe' },
  { id: 496, title: '6. Golden Rules (Bekerja di Area Terbatas)', notionId: '223d00c5-c809-80e5-84f8-da359d891708' },
  { id: 497, title: '7.  Golden Rules (Peralatan dan Perlengkapan)', notionId: '223d00c5-c809-807b-a06b-f0d4770a36a3' },
  { id: 498, title: 'MATERI BRIEFING (SAFETY TALK)', notionId: '207d00c5-c809-800c-bf51-ea4e5111bf3f' },
  { id: 499, title: 'ENVORMASI COMIC', notionId: '207d00c5-c809-8002-b9fd-dce7e6413ff9' },
  { id: 500, title: 'SPDK DAN ATURAN PERUSAHAAN', notionId: 'b6b91d56-118d-4acf-a542-64deed757549' },
  { id: 501, title: 'JOB DESCRIPTION', notionId: '223d00c5-c809-80bd-b795-f679ffaa644f' },
  { id: 502, title: 'IM IT', notionId: 'b283d6e6-fcd6-4156-9139-5d2808d44863' },
  { id: 503, title: 'IM HR', notionId: 'ca461296-4744-45aa-a425-805960a2f584' },
  { id: 504, title: 'IM SAFETY', notionId: 'd9f70ace-bd4b-4ad6-9394-ad5075b8041e' },
  { id: 505, title: 'IM Hari Sehat dan Hari Tanpa Tembakau TBP GPS', notionId: '19fd00c5-c809-8073-acc9-e79b52d2b5a2' },
  { id: 506, title: 'EM QC', notionId: '235d00c5-c809-80e4-8c30-d0bbf5a97235' },
  { id: 507, title: 'KEBIJAKAN PERUSAHAAN', notionId: '282d00c5-c809-801a-8cf3-d8c59b01557f' },
  { id: 508, title: 'INDUKSI INTERNAL', notionId: '26fd00c5-c809-80a2-bf17-f7d21544f477' },
  { id: 509, title: 'TRAINING NEED ANALYSIS (TNA)', notionId: '21ed00c5-c809-804d-b445-f99d1048ee4a' },
  { id: 510, title: 'IDENTIFIKASI BAHAYA DAN PENGENDALIAN RESIKO (IBPR)', notionId: '2a7d00c5-c809-80c3-9597-e136bbabcb91' },
  { id: 511, title: 'IDENTIFIKASI ,EVALUASI ASPEK DAN DAMPAK LINGKUNGAN (IADL)', notionId: '2a7d00c5-c809-809c-8082-e618556e8c33' },
  { id: 512, title: 'SECURITY RISK ASSESMENT (SRA)', notionId: '2a7d00c5-c809-80bf-b69c-cec3c55419ae' },
  { id: 513, title: 'HASIL MEETING INTERNAL PREP & LAB', notionId: '221d00c5-c809-80fd-bddb-cf10771abb8e' },
  { id: 514, title: 'ISO 14001', notionId: 'f9696bbb-95fd-4345-b208-4cf688eb49c3' },
  { id: 515, title: 'ISO 45001', notionId: '4c4cc6f5-f7f0-4c36-b23e-8167092d613a' }
];

async function main() {
  const client = await pool.connect();

  const empRes = await client.query('SELECT nik, name, email FROM employees');
  const employees = empRes.rows;
  const userMap = {};

  async function getAuthor(userId) {
    if (!userId) return { nik: 'SYSTEM', name: 'Notion Sync' };
    if (userMap[userId]) return userMap[userId];

    try {
      const u = await notion.users.retrieve({ user_id: userId });
      const uName = u.name || 'Anonymous';
      const uEmail = u.person?.email || '';

      const matched = employees.find(e =>
        (uEmail && e.email && e.email.toLowerCase() === uEmail.toLowerCase()) ||
        (e.name && uName && (e.name.toLowerCase().includes(uName.toLowerCase()) || uName.toLowerCase().includes(e.name.toLowerCase())))
      );

      const result = {
        nik: matched ? matched.nik : 'NOTION_' + userId.substring(0, 8),
        name: matched ? matched.name : uName
      };
      userMap[userId] = result;
      return result;
    } catch (e) {
      const result = { nik: 'NOTION_USER', name: 'Personil Tim' };
      userMap[userId] = result;
      return result;
    }
  }

  async function uploadFileIfNeeded(s3Url, originalName, prefix) {
    const cleanOrig = sanitizeFilename(originalName || 'attachment');
    const cacheKey = cleanOrig.toLowerCase();

    if (attachmentCache[cacheKey]?.driveId) {
      const item = attachmentCache[cacheKey];
      const isImg = item.mimeType?.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp)$/i.test(item.fileName || cleanOrig);
      return {
        id: item.driveId,
        name: cleanOrig,
        category: isImg ? 'image' : 'file',
        mimeType: item.mimeType || getMimeType(cleanOrig),
        size: 1024,
        driveViewUrl: item.driveViewUrl || `https://drive.google.com/file/d/${item.driveId}/view?usp=sharing`,
        driveDownloadUrl: item.driveDownloadUrl || `https://drive.google.com/uc?id=${item.driveId}&export=download`,
        directUrl: isImg ? `https://lh3.googleusercontent.com/d/${item.driveId}` : (item.driveViewUrl || `https://drive.google.com/file/d/${item.driveId}/view?usp=sharing`)
      };
    }

    const cleanUploadName = `${sanitizeFilename(prefix)}_${cleanOrig}`;
    const localFilePath = path.join(UPLOAD_DIR, cleanUploadName);
    const mimeType = getMimeType(cleanOrig);
    const isImage = mimeType.startsWith('image/');

    // Download to disk if not exists
    if (!fs.existsSync(localFilePath) || fs.statSync(localFilePath).size === 0) {
      console.log(`      📥 Downloading to disk: ${cleanOrig}...`);
      const fRes = await fetch(s3Url);
      if (!fRes.ok) throw new Error(`HTTP ${fRes.status}`);
      const fileStream = fs.createWriteStream(localFilePath);
      // Stream directly to file
      const { Readable } = require('stream');
      const nodeStream = Readable.fromWeb(fRes.body);
      await pipeline(nodeStream, fileStream);
    }

    const fileSize = fs.statSync(localFilePath).size;
    console.log(`      ☁️ Uploading to Drive (${fileSize} bytes): ${cleanUploadName}...`);

    const driveRes = await drive.files.create({
      requestBody: {
        name: cleanUploadName,
        parents: [GDRIVE_FOLDER_ID],
      },
      media: {
        mimeType,
        body: fs.createReadStream(localFilePath),
      },
      fields: 'id, name, webViewLink, webContentLink',
      supportsAllDrives: true,
    });

    const driveId = driveRes.data.id;
    try {
      await drive.permissions.create({
        fileId: driveId,
        requestBody: { role: 'reader', type: 'anyone' },
        supportsAllDrives: true,
      });
    } catch (e) {}

    const driveViewUrl = `https://drive.google.com/file/d/${driveId}/view?usp=sharing`;
    const driveDownloadUrl = `https://drive.google.com/uc?id=${driveId}&export=download`;
    const directUrl = isImage ? `https://lh3.googleusercontent.com/d/${driveId}` : driveViewUrl;

    const resObj = {
      id: driveId,
      name: cleanOrig,
      category: isImage ? 'image' : 'file',
      mimeType,
      size: fileSize,
      driveViewUrl,
      driveDownloadUrl,
      directUrl
    };

    attachmentCache[cacheKey] = {
      driveId,
      driveViewUrl,
      driveDownloadUrl,
      fileName: cleanOrig,
      mimeType
    };
    saveCache();
    return resObj;
  }

  let totalCommentsInserted = 0;
  let totalFilesUploaded = 0;

  for (let pIdx = 0; pIdx < INFO_PAGES.length; pIdx++) {
    const page = INFO_PAGES[pIdx];
    console.log(`\n======================================================`);
    console.log(`[${pIdx + 1}/${INFO_PAGES.length}] Inspecting Page [ID: ${page.id}] "${page.title}" (${page.notionId})`);
    console.log(`======================================================`);

    // 1. Page-level comments
    try {
      const pageComments = await notion.comments.list({ block_id: page.notionId });
      console.log(`  Found ${pageComments.results.length} page-level comments`);
      for (const c of pageComments.results) {
        const author = await getAuthor(c.created_by?.id);
        const text = c.rich_text?.map(t => t.plain_text).join('').trim() || '';
        const createdAt = c.created_time ? new Date(c.created_time) : new Date();

        const exist = await client.query(`
          SELECT id FROM bulletin_comments 
          WHERE post_id = $1 AND topic_id = $2 AND content = $3 
          LIMIT 1;
        `, [page.id, page.notionId, text || 'Pembaruan informasi']);

        if (exist.rows.length === 0) {
          const uploadedAttachments = [];
          if (c.attachments && c.attachments.length > 0) {
            for (let i = 0; i < c.attachments.length; i++) {
              const att = c.attachments[i];
              const s3Url = att.file?.url;
              if (!s3Url) continue;
              const origName = extractFilename(s3Url, `attachment_${i + 1}`);
              try {
                const uploaded = await uploadFileIfNeeded(s3Url, origName, page.title);
                uploadedAttachments.push(uploaded);
                totalFilesUploaded++;
              } catch (err) {
                console.error(`      Failed to upload comment attachment:`, err.message);
              }
            }
          }

          const fileUrlStr = uploadedAttachments.length > 0 ? JSON.stringify(uploadedAttachments) : null;
          const fileNameStr = uploadedAttachments.length > 0 ? uploadedAttachments[0].name : null;

          await client.query(`
            INSERT INTO bulletin_comments (
              post_id, topic_title, topic_id, section, category, status_update,
              author_nik, author_name, content, file_url, file_name, created_at, universe
            ) VALUES (
              $1, $2, $3, 'INFORMATION', 'INFO::1', 'OPEN',
              $4, $5, $6, $7, $8, $9, 'TBP_GPS'
            )
          `, [
            page.id, page.title, page.notionId,
            author.nik, author.name, text || 'Pembaruan informasi',
            fileUrlStr, fileNameStr, createdAt
          ]);
          totalCommentsInserted++;
          console.log(`  ✓ Inserted page-level comment by ${author.name}: "${text.substring(0, 40)}"`);
        }
      }
    } catch (err) {
      console.warn(`  Could not read page comments for ${page.title}:`, err.message);
    }

    // 2. Scan child blocks for child databases and images
    try {
      const blocks = await notion.blocks.children.list({ block_id: page.notionId, page_size: 100 });
      const childDbs = blocks.results.filter(b => b.type === 'child_database');

      if (childDbs.length > 0) {
        console.log(`  Found ${childDbs.length} child databases on "${page.title}"`);

        for (const dbBlock of childDbs) {
          const dbId = dbBlock.id;
          const dbTitle = dbBlock.child_database?.title || page.title;
          console.log(`\n  --- Database: "${dbTitle}" (${dbId}) ---`);

          let rows = [];
          let cursor = undefined;
          do {
            const queryRes = await notion.databases.query({
              database_id: dbId,
              page_size: 100,
              start_cursor: cursor
            });
            rows = rows.concat(queryRes.results || []);
            cursor = queryRes.has_more ? queryRes.next_cursor : undefined;
          } while (cursor);

          console.log(`  Total database rows: ${rows.length}`);

          for (let rIdx = 0; rIdx < rows.length; rIdx++) {
            const row = rows[rIdx];
            const props = row.properties;

            // Extract row title
            let rowTitle = '';
            const titleProp = Object.values(props).find(p => p.type === 'title');
            if (titleProp?.title?.[0]?.plain_text) {
              rowTitle = titleProp.title[0].plain_text.trim();
            }
            if (!rowTitle) {
              const textProp = Object.values(props).find(p => p.type === 'rich_text');
              if (textProp?.rich_text?.[0]?.plain_text) {
                rowTitle = textProp.rich_text[0].plain_text.trim();
              }
            }
            if (!rowTitle) rowTitle = `Baris ${rIdx + 1}`;

            const statusProp = Object.values(props).find(p => p.type === 'status' || p.type === 'select');
            const status = statusProp?.status?.name || statusProp?.select?.name || 'OPEN';

            console.log(`    [Row ${rIdx + 1}/${rows.length}] "${rowTitle}" (${row.id})`);

            // A. Row-level comments
            try {
              const rowComments = await notion.comments.list({ block_id: row.id });
              if (rowComments.results.length > 0) {
                console.log(`      Found ${rowComments.results.length} comments on "${rowTitle}"`);
              }

              for (const c of rowComments.results) {
                const author = await getAuthor(c.created_by?.id);
                const text = c.rich_text?.map(t => t.plain_text).join('').trim() || '';
                const createdAt = c.created_time ? new Date(c.created_time) : new Date();

                const exist = await client.query(`
                  SELECT id FROM bulletin_comments 
                  WHERE post_id = $1 AND topic_id = $2 AND content = $3 
                  LIMIT 1;
                `, [page.id, row.id, text || 'Pembaruan progres']);

                if (exist.rows.length === 0) {
                  const uploadedAttachments = [];
                  if (c.attachments && c.attachments.length > 0) {
                    for (let i = 0; i < c.attachments.length; i++) {
                      const att = c.attachments[i];
                      const s3Url = att.file?.url;
                      if (!s3Url) continue;
                      const origName = extractFilename(s3Url, `attachment_${i + 1}`);
                      try {
                        const uploaded = await uploadFileIfNeeded(s3Url, origName, rowTitle);
                        uploadedAttachments.push(uploaded);
                        totalFilesUploaded++;
                      } catch (err) {
                        console.error(`        Failed to upload row comment attachment:`, err.message);
                      }
                    }
                  }

                  const fileUrlStr = uploadedAttachments.length > 0 ? JSON.stringify(uploadedAttachments) : null;
                  const fileNameStr = uploadedAttachments.length > 0 ? uploadedAttachments[0].name : null;

                  await client.query(`
                    INSERT INTO bulletin_comments (
                      post_id, topic_title, topic_id, section, category, status_update,
                      author_nik, author_name, content, file_url, file_name, created_at, universe
                    ) VALUES (
                      $1, $2, $3, 'INFORMATION', 'INFO::1', $4,
                      $5, $6, $7, $8, $9, $10, 'TBP_GPS'
                    )
                  `, [
                    page.id, rowTitle, row.id, status,
                    author.nik, author.name, text || 'Pembaruan progres',
                    fileUrlStr, fileNameStr, createdAt
                  ]);
                  totalCommentsInserted++;
                  console.log(`      ✓ Inserted comment by ${author.name}: "${text.substring(0, 40)}"`);
                }
              }
            } catch (err) {
              // Row comments error
            }

            // B. Row property files
            const fileProps = Object.values(props).filter(p => p.type === 'files');
            for (const fp of fileProps) {
              if (fp.files && fp.files.length > 0) {
                const uploadedRowFiles = [];
                for (const f of fp.files) {
                  const s3Url = f.file?.url || f.external?.url;
                  if (!s3Url) continue;
                  const origName = f.name || extractFilename(s3Url, 'file');
                  try {
                    const uploaded = await uploadFileIfNeeded(s3Url, origName, rowTitle);
                    uploadedRowFiles.push(uploaded);
                    totalFilesUploaded++;
                  } catch (err) {
                    console.error(`        Failed to upload row file:`, err.message);
                  }
                }

                if (uploadedRowFiles.length > 0) {
                  const existFile = await client.query(`
                    SELECT id FROM bulletin_comments 
                    WHERE post_id = $1 AND topic_id = $2 AND author_name = 'Notion Attachment' 
                    LIMIT 1;
                  `, [page.id, row.id]);

                  if (existFile.rows.length === 0) {
                    await client.query(`
                      INSERT INTO bulletin_comments (
                        post_id, topic_title, topic_id, section, category, status_update,
                        author_nik, author_name, content, file_url, file_name, created_at, universe
                      ) VALUES (
                        $1, $2, $3, 'INFORMATION', 'INFO::1', $4,
                        'SYSTEM', 'Notion Attachment', 'Lampiran Dokumen', $5, $6, NOW(), 'TBP_GPS'
                      )
                    `, [
                      page.id, rowTitle, row.id, status,
                      JSON.stringify(uploadedRowFiles), uploadedRowFiles[0].name
                    ]);
                    totalCommentsInserted++;
                    console.log(`      ✓ Inserted ${uploadedRowFiles.length} row property files for "${rowTitle}"`);
                  }
                }
              }
            }

            // C. Embedded images & document content in row child blocks
            try {
              const rowChildren = await notion.blocks.children.list({ block_id: row.id, page_size: 50 });
              const imageBlocks = rowChildren.results.filter(b => b.type === 'image');
              const fileBlocks = rowChildren.results.filter(b => b.type === 'file' || b.type === 'pdf');
              const textBlocks = rowChildren.results.filter(b => ['paragraph', 'callout', 'bulleted_list_item', 'numbered_list_item', 'quote'].includes(b.type));

              // Upload embedded images
              if (imageBlocks.length > 0) {
                const uploadedImages = [];
                for (let imgIdx = 0; imgIdx < imageBlocks.length; imgIdx++) {
                  const ib = imageBlocks[imgIdx];
                  const s3Url = ib.image?.file?.url || ib.image?.external?.url;
                  if (!s3Url) continue;
                  const origName = extractFilename(s3Url, `embedded_img_${imgIdx + 1}.jpg`);
                  try {
                    const uploaded = await uploadFileIfNeeded(s3Url, origName, rowTitle);
                    uploadedImages.push(uploaded);
                    totalFilesUploaded++;
                  } catch (err) {
                    console.error(`        Failed to upload row embedded image:`, err.message);
                  }
                }

                if (uploadedImages.length > 0) {
                  const existImg = await client.query(`
                    SELECT id FROM bulletin_comments 
                    WHERE post_id = $1 AND topic_id = $2 AND author_name = 'Notion Gallery' 
                    LIMIT 1;
                  `, [page.id, row.id]);

                  if (existImg.rows.length === 0) {
                    await client.query(`
                      INSERT INTO bulletin_comments (
                        post_id, topic_title, topic_id, section, category, status_update,
                        author_nik, author_name, content, file_url, file_name, created_at, universe
                      ) VALUES (
                        $1, $2, $3, 'INFORMATION', 'INFO::1', $4,
                        'SYSTEM', 'Notion Gallery', 'Galeri & Dokumentasi Visual', $5, $6, NOW(), 'TBP_GPS'
                      )
                    `, [
                      page.id, rowTitle, row.id, status,
                      JSON.stringify(uploadedImages), uploadedImages[0].name
                    ]);
                    totalCommentsInserted++;
                    console.log(`      ✓ Inserted ${uploadedImages.length} embedded images for "${rowTitle}"`);
                  }
                }
              }

              // Upload embedded files/pdfs
              if (fileBlocks.length > 0) {
                const uploadedFiles = [];
                for (let fIdx = 0; fIdx < fileBlocks.length; fIdx++) {
                  const fb = fileBlocks[fIdx];
                  const fObj = fb[fb.type];
                  const s3Url = fObj?.file?.url || fObj?.external?.url;
                  if (!s3Url) continue;
                  const origName = fObj?.name || extractFilename(s3Url, `doc_${fIdx + 1}.pdf`);
                  try {
                    const uploaded = await uploadFileIfNeeded(s3Url, origName, rowTitle);
                    uploadedFiles.push(uploaded);
                    totalFilesUploaded++;
                  } catch (err) {
                    console.error(`        Failed to upload row embedded doc:`, err.message);
                  }
                }

                if (uploadedFiles.length > 0) {
                  const existFileBlock = await client.query(`
                    SELECT id FROM bulletin_comments 
                    WHERE post_id = $1 AND topic_id = $2 AND author_name = 'Notion File' 
                    LIMIT 1;
                  `, [page.id, row.id]);

                  if (existFileBlock.rows.length === 0) {
                    await client.query(`
                      INSERT INTO bulletin_comments (
                        post_id, topic_title, topic_id, section, category, status_update,
                        author_nik, author_name, content, file_url, file_name, created_at, universe
                      ) VALUES (
                        $1, $2, $3, 'INFORMATION', 'INFO::1', $4,
                        'SYSTEM', 'Notion File', 'Lampiran Dokumen Tambahan', $5, $6, NOW(), 'TBP_GPS'
                      )
                    `, [
                      page.id, rowTitle, row.id, status,
                      JSON.stringify(uploadedFiles), uploadedFiles[0].name
                    ]);
                    totalCommentsInserted++;
                    console.log(`      ✓ Inserted ${uploadedFiles.length} embedded docs for "${rowTitle}"`);
                  }
                }
              }

              // Text blocks note
              if (textBlocks.length > 0) {
                const paragraphs = textBlocks.map(b => {
                  const rt = b[b.type]?.rich_text;
                  return rt ? rt.map(t => t.plain_text).join('') : '';
                }).filter(t => t.trim().length > 0);

                if (paragraphs.length > 0) {
                  const noteContent = paragraphs.join('\n\n');
                  const existNote = await client.query(`
                    SELECT id FROM bulletin_comments 
                    WHERE post_id = $1 AND topic_id = $2 AND author_name = 'Notion Content' 
                    LIMIT 1;
                  `, [page.id, row.id]);

                  if (existNote.rows.length === 0) {
                    await client.query(`
                      INSERT INTO bulletin_comments (
                        post_id, topic_title, topic_id, section, category, status_update,
                        author_nik, author_name, content, created_at, universe
                      ) VALUES (
                        $1, $2, $3, 'INFORMATION', 'INFO::1', $4,
                        'SYSTEM', 'Notion Content', $5, NOW(), 'TBP_GPS'
                      )
                    `, [
                      page.id, rowTitle, row.id, status,
                      noteContent
                    ]);
                    totalCommentsInserted++;
                    console.log(`      ✓ Inserted row text note (${noteContent.length} chars) for "${rowTitle}"`);
                  }
                }
              }

            } catch (err) {
              // Row blocks error
            }
          }
        }
      }
    } catch (err) {
      console.warn(`  Could not read blocks for page ${page.title}:`, err.message);
    }
  }

  saveCache();
  client.release();
  await pool.end();

  console.log(`\n======================================================`);
  console.log(`🎉 MIGRATION FINISHED!`);
  console.log(`Total Comments Inserted: ${totalCommentsInserted}`);
  console.log(`Total Files Uploaded: ${totalFilesUploaded}`);
  console.log(`======================================================\n`);
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
