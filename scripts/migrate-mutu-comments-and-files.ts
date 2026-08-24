import { Client } from '@notionhq/client';
import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

const token = process.env.NOTION_API_KEY;
console.log('Using Notion API Key:', token?.substring(0, 12) + '...');

const notion = new Client({ auth: token });

async function getDriveToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN || '',
      grant_type: 'refresh_token'
    }),
    signal: AbortSignal.timeout(15000)
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Failed to get Drive token: ' + JSON.stringify(data));
  return data.access_token;
}

async function uploadToDrive(driveToken: string, buffer: Buffer, mimeType: string, filename: string): Promise<any> {
  const targetFolder = process.env.GDRIVE_BULLETIN_ATTACHMENTS_FOLDER_ID || '1JE6EusixbK7saIzboKNOk9aMiAqEX-zF';
  const metadata: any = {
    name: filename,
    parents: [targetFolder]
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
  
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink,thumbnailLink&supportsAllDrives=true', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${driveToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody,
    signal: AbortSignal.timeout(25000)
  });
  
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));

  // Set permission to anyone with link
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions?supportsAllDrives=true`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${driveToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
      signal: AbortSignal.timeout(10000)
    });
  } catch(e) {}

  return data;
}

function getMimeType(filename: string, category?: string): string {
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

function extractFilename(url: string, defaultName: string): string {
  try {
    const cleanUrl = url.split('?')[0];
    const parts = cleanUrl.split('/');
    const rawName = decodeURIComponent(parts[parts.length - 1]);
    return rawName || defaultName;
  } catch (e) {
    return defaultName;
  }
}

async function run() {
  console.log('=== 1. Starting Comments & Files Migration for MANAJEMEN MUTU ===');
  let driveToken = await getDriveToken();

  // 1. Get employees for author mapping
  const empRes = await db.execute(sql`SELECT nik, name, email FROM employees`);
  const employees: any[] = empRes.rows;

  const userMap: Record<string, { nik: string; name: string }> = {};

  async function getAuthor(userId?: string) {
    if (!userId) return { nik: 'SYSTEM', name: 'Notion Sync' };
    if (userMap[userId]) return userMap[userId];

    try {
      const u: any = await notion.users.retrieve({ user_id: userId });
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
      const result = { nik: 'NOTION_USER', name: 'Anggota Tim' };
      userMap[userId] = result;
      return result;
    }
  }

  // 2. Fetch all Manajemen Mutu posts from DB
  const mutuPostsRes = await db.execute(sql`
    SELECT id, title, notion_id, content 
    FROM bulletin_posts 
    WHERE category = 'MANAJEMEN MUTU' OR title ILIKE '%Manajemen Mutu%'
    ORDER BY id ASC;
  `);
  const posts: any[] = mutuPostsRes.rows;
  console.log(`Found ${posts.length} Manajemen Mutu posts to inspect for comments and files.`);

  let totalCommentsMigrated = 0;
  let totalFilesUploaded = 0;

  for (const post of posts) {
    if (!post.notion_id) continue;
    console.log(`\n--- Inspecting Post [ID: ${post.id}] "${post.title}" (${post.notion_id}) ---`);

    // A. Migrate page-level comments
    try {
      const pageComments = await notion.comments.list({ block_id: post.notion_id });
      for (const c of pageComments.results as any[]) {
        const author = await getAuthor(c.created_by?.id);
        const text = c.rich_text?.map((t: any) => t.plain_text).join('').trim() || '';
        const createdAt = c.created_time ? new Date(c.created_time) : new Date();

        // Check if already in DB
        const existCheck = await db.execute(sql`
          SELECT id FROM bulletin_comments 
          WHERE post_id = ${post.id} AND topic_id = ${post.notion_id} AND content = ${text || 'Pembaruan catatan'}
          LIMIT 1;
        `);
        if (existCheck.rows.length > 0) continue;

        const uploadedAttachments: any[] = [];
        if (c.attachments && c.attachments.length > 0) {
          for (let i = 0; i < c.attachments.length; i++) {
            const att = c.attachments[i];
            const s3Url = att.file?.url;
            if (!s3Url) continue;

            const originalName = extractFilename(s3Url, `attachment_${i + 1}`);
            const cleanName = `${post.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${originalName}`;
            const mimeType = getMimeType(originalName, att.category);

            try {
              console.log(`  Downloading comment attachment: ${originalName}...`);
              const imgRes = await fetch(s3Url, { signal: AbortSignal.timeout(15000) });
              if (!imgRes.ok) continue;
              const arrayBuffer = await imgRes.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);

              console.log(`  Uploading to Google Drive (${buffer.length} bytes)...`);
              const driveFile = await uploadToDrive(driveToken, buffer, mimeType, cleanName);
              const isImage = mimeType.startsWith('image/');
              const directUrl = isImage ? `https://lh3.googleusercontent.com/d/${driveFile.id}` : driveFile.webViewLink;

              uploadedAttachments.push({
                id: driveFile.id,
                name: originalName,
                category: att.category || (isImage ? 'image' : 'file'),
                mimeType,
                size: buffer.length,
                driveViewUrl: driveFile.webViewLink,
                driveDownloadUrl: driveFile.webContentLink,
                directUrl
              });
              totalFilesUploaded++;
            } catch (err: any) {
              console.error(`  Error uploading attachment:`, err.message);
              try { driveToken = await getDriveToken(); } catch(e) {}
            }
          }
        }

        const fileUrlStr = uploadedAttachments.length > 0 ? JSON.stringify(uploadedAttachments) : null;
        const fileNameStr = uploadedAttachments.length > 0 ? uploadedAttachments[0].name : null;

        await db.execute(sql`
          INSERT INTO bulletin_comments (
            post_id, topic_title, topic_id, section, category, status_update,
            author_nik, author_name, content, file_url, file_name, created_at, universe
          ) VALUES (
            ${post.id}, ${post.title}, ${post.notion_id}, 'MANAJEMEN MUTU', 'MANAJEMEN MUTU', 'OPEN',
            ${author.nik}, ${author.name}, ${text || 'Pembaruan catatan'}, ${fileUrlStr}, ${fileNameStr}, ${createdAt}, 'TBP_GPS'
          );
        `);
        totalCommentsMigrated++;
      }
    } catch (e: any) {
      console.warn(`  Could not fetch page-level comments for ${post.notion_id}:`, e.message);
    }

    // B. Discover child databases inside this post to migrate row-level comments and attachments
    try {
      const blocks = await notion.blocks.children.list({ block_id: post.notion_id, page_size: 50 });
      const dbBlocks = blocks.results.filter((b: any) => b.type === 'child_database');

      for (const dbBlock of dbBlocks as any[]) {
        const dbTitle = dbBlock.child_database?.title || 'Tabel Data';
        console.log(`  Found Database "${dbTitle}" (${dbBlock.id})`);

        const rows = await notion.databases.query({ database_id: dbBlock.id, page_size: 100 });
        for (const row of rows.results as any[]) {
          const props = row.properties;
          const rowTitle = Object.values(props).find((p: any) => p.type === 'title')?.title?.[0]?.plain_text || 'Item';
          const statusProp: any = Object.values(props).find((p: any) => p.type === 'status' || p.type === 'select');
          const status = statusProp?.status?.name || statusProp?.select?.name || 'OPEN';

          // Check for row comments
          try {
            const rowComments = await notion.comments.list({ block_id: row.id });
            for (const c of rowComments.results as any[]) {
              const author = await getAuthor(c.created_by?.id);
              const text = c.rich_text?.map((t: any) => t.plain_text).join('').trim() || '';
              const createdAt = c.created_time ? new Date(c.created_time) : new Date();

              // Check if already in DB
              const existCheck = await db.execute(sql`
                SELECT id FROM bulletin_comments 
                WHERE post_id = ${post.id} AND topic_id = ${row.id} AND content = ${text || 'Pembaruan progres'}
                LIMIT 1;
              `);
              if (existCheck.rows.length > 0) {
                continue;
              }

              const uploadedAttachments: any[] = [];
              if (c.attachments && c.attachments.length > 0) {
                for (let i = 0; i < c.attachments.length; i++) {
                  const att = c.attachments[i];
                  const s3Url = att.file?.url;
                  if (!s3Url) continue;

                  const originalName = extractFilename(s3Url, `attachment_${i + 1}`);
                  const cleanName = `${rowTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_${originalName}`;
                  const mimeType = getMimeType(originalName, att.category);

                  try {
                    console.log(`    Downloading row comment attachment: ${originalName}...`);
                    const imgRes = await fetch(s3Url, { signal: AbortSignal.timeout(15000) });
                    if (!imgRes.ok) continue;
                    const arrayBuffer = await imgRes.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);

                    console.log(`    Uploading to Google Drive (${buffer.length} bytes)...`);
                    const driveFile = await uploadToDrive(driveToken, buffer, mimeType, cleanName);
                    const isImage = mimeType.startsWith('image/');
                    const directUrl = isImage ? `https://lh3.googleusercontent.com/d/${driveFile.id}` : driveFile.webViewLink;

                    uploadedAttachments.push({
                      id: driveFile.id,
                      name: originalName,
                      category: att.category || (isImage ? 'image' : 'file'),
                      mimeType,
                      size: buffer.length,
                      driveViewUrl: driveFile.webViewLink,
                      driveDownloadUrl: driveFile.webContentLink,
                      directUrl
                    });
                    totalFilesUploaded++;
                  } catch (err: any) {
                    console.error(`    Error uploading row attachment:`, err.message);
                    try { driveToken = await getDriveToken(); } catch(e) {}
                  }
                }
              }

              const fileUrlStr = uploadedAttachments.length > 0 ? JSON.stringify(uploadedAttachments) : null;
              const fileNameStr = uploadedAttachments.length > 0 ? uploadedAttachments[0].name : null;

              await db.execute(sql`
                INSERT INTO bulletin_comments (
                  post_id, topic_title, topic_id, section, category, status_update,
                  author_nik, author_name, content, file_url, file_name, created_at, universe
                ) VALUES (
                  ${post.id}, ${rowTitle}, ${row.id}, 'MANAJEMEN MUTU', 'MANAJEMEN MUTU', ${status},
                  ${author.nik}, ${author.name}, ${text || 'Pembaruan progres'}, ${fileUrlStr}, ${fileNameStr}, ${createdAt}, 'TBP_GPS'
                );
              `);
              totalCommentsMigrated++;
              console.log(`    ✓ Migrated comment for row "${rowTitle}"`);
            }
          } catch (e: any) {
            console.warn(`    Could not fetch comments for row ${row.id}:`, e.message);
          }

          // Also check for Files & media properties on the row itself
          const fileProps = Object.values(props).filter((p: any) => p.type === 'files');
          for (const fp of fileProps as any[]) {
            if (fp.files && fp.files.length > 0) {
              const uploadedRowFiles: any[] = [];
              for (const f of fp.files) {
                const s3Url = f.file?.url || f.external?.url;
                if (!s3Url) continue;
                const originalName = f.name || extractFilename(s3Url, 'file');
                const cleanName = `${rowTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_${originalName}`;
                const mimeType = getMimeType(originalName);

                try {
                  console.log(`    Downloading row property file: ${originalName}...`);
                  const fRes = await fetch(s3Url, { signal: AbortSignal.timeout(15000) });
                  if (!fRes.ok) continue;
                  const arrayBuffer = await fRes.arrayBuffer();
                  const buffer = Buffer.from(arrayBuffer);

                  console.log(`    Uploading row file to Drive...`);
                  const driveFile = await uploadToDrive(driveToken, buffer, mimeType, cleanName);
                  const isImage = mimeType.startsWith('image/');
                  const directUrl = isImage ? `https://lh3.googleusercontent.com/d/${driveFile.id}` : driveFile.webViewLink;

                  uploadedRowFiles.push({
                    id: driveFile.id,
                    name: originalName,
                    mimeType,
                    size: buffer.length,
                    driveViewUrl: driveFile.webViewLink,
                    directUrl
                  });
                  totalFilesUploaded++;
                } catch (err: any) {
                  console.error(`    Error uploading row property file:`, err.message);
                }
              }

              if (uploadedRowFiles.length > 0) {
                await db.execute(sql`
                  INSERT INTO bulletin_comments (
                    post_id, topic_title, topic_id, section, category, status_update,
                    author_nik, author_name, content, file_url, file_name, created_at, universe
                  ) VALUES (
                    ${post.id}, ${rowTitle}, ${row.id}, 'MANAJEMEN MUTU', 'MANAJEMEN MUTU', ${status},
                    'SYSTEM', 'Notion Attachment', 'Lampiran Dokumen', ${JSON.stringify(uploadedRowFiles)}, ${uploadedRowFiles[0].name}, ${new Date()}, 'TBP_GPS'
                  );
                `);
                console.log(`    ✓ Stored ${uploadedRowFiles.length} row property files for "${rowTitle}"`);
              }
            }
          }
        }
      }
    } catch (e: any) {
      console.warn(`  Error processing child databases for post ${post.id}:`, e.message);
    }
  }

  console.log(`\n🎉 MIGRATION COMPLETE!`);
  console.log(`- Total Comments Migrated: ${totalCommentsMigrated}`);
  console.log(`- Total Files Uploaded to Google Drive: ${totalFilesUploaded}`);
  process.exit(0);
}

run().catch(err => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
