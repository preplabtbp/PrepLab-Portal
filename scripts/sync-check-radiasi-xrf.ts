import { Client } from '@notionhq/client';
import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const BULLETIN_FOLDER_ID = process.env.GDRIVE_BULLETIN_ATTACHMENTS_FOLDER_ID || '1JE6EusixbK7saIzboKNOk9aMiAqEX-zF';

const PAGE_ID = '129d00c5-c809-819f-a75e-d298a779b562';
const TOPIC_TITLE = 'Check Radiasi XRF';

async function getDriveToken(): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Google Drive OAuth credentials in environment');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error('Failed to get Drive token: ' + JSON.stringify(data));
  return data.access_token;
}

async function uploadToDrive(driveToken: string, buffer: Buffer, mimeType: string, filename: string): Promise<any> {
  const metadata: any = {
    name: filename,
    parents: [BULLETIN_FOLDER_ID]
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
    signal: AbortSignal.timeout(30000)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));

  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions?supportsAllDrives=true`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${driveToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' })
    });
  } catch (e) {}

  return data;
}

const userCache: Record<string, string> = {};

async function resolveUserName(c: any): Promise<string> {
  if (c.display_name?.resolved_name) {
    return c.display_name.resolved_name;
  }
  const userId = c.created_by?.id;
  if (!userId) return 'Personil Laboratorium';
  if (userCache[userId]) return userCache[userId];

  try {
    const u: any = await notion.users.retrieve({ user_id: userId });
    const name = u.name || u.person?.email || 'Personil Laboratorium';
    userCache[userId] = name;
    return name;
  } catch (e) {
    userCache[userId] = 'Personil Laboratorium';
    return 'Personil Laboratorium';
  }
}

async function run() {
  console.log('=== SYNCING NOTION: Check Radiasi XRF ===');

  let driveToken: string | null = null;
  try {
    driveToken = await getDriveToken();
    console.log('✓ Google Drive authenticated');
  } catch (e: any) {
    console.warn('Drive auth warning:', e.message);
  }

  // 1. Check page blocks / media in page body
  try {
    const pageBlocks: any = await notion.blocks.children.list({ block_id: PAGE_ID });
    console.log(`Page blocks found: ${pageBlocks.results.length}`);
    for (const b of pageBlocks.results) {
      console.log(`Block type: ${b.type}`, b[b.type]);
    }
  } catch (e: any) {
    console.warn('Page blocks check error:', e.message);
  }

  // 2. Target Bulletin Post ID for Weekly Laboratorium
  const postRes = await db.execute(sql`
    SELECT id FROM bulletin_posts 
    WHERE notion_id = '12ad00c5-c809-8159-96c3-f661b0afb522' OR title = 'Weekly Laboratorium'
    ORDER BY id DESC LIMIT 1;
  `);

  if (postRes.rows.length === 0) {
    throw new Error('Weekly Laboratorium post not found in bulletin_posts');
  }

  const postId = Number(postRes.rows[0].id);
  console.log(`Target Bulletin Post ID: #${postId}`);

  // 3. Fetch all comments from Notion
  let allComments: any[] = [];
  let cursor: string | undefined = undefined;
  let batch = 1;

  do {
    const resp: any = await notion.comments.list({
      block_id: PAGE_ID,
      start_cursor: cursor,
      page_size: 100
    });
    console.log(`Batch ${batch}: ${resp.results.length} comments (has_more: ${resp.has_more})`);
    allComments = allComments.concat(resp.results);
    cursor = resp.has_more ? resp.next_cursor : undefined;
    batch++;
  } while (cursor);

  console.log(`Total comments from Notion for "${TOPIC_TITLE}": ${allComments.length}`);

  // Sort chronologically ascending (oldest -> newest)
  allComments.sort((a, b) => new Date(a.created_time).getTime() - new Date(b.created_time).getTime());

  // 4. Clear existing comments for this topic to avoid duplicates
  await db.execute(sql`
    DELETE FROM bulletin_comments 
    WHERE post_id = ${postId} AND (
      LOWER(topic_title) = ${TOPIC_TITLE.toLowerCase()} OR 
      LOWER(topic_title) LIKE '%radiasi%'
    );
  `);
  console.log(`Cleared previous local comments for "${TOPIC_TITLE}"`);

  // 5. Upload attachments and insert comments
  let insertedCount = 0;
  let attachmentUploadCount = 0;
  const CHUNK_SIZE = 8;

  for (let i = 0; i < allComments.length; i += CHUNK_SIZE) {
    const chunk = allComments.slice(i, i + CHUNK_SIZE);
    await Promise.all(chunk.map(async (c, cIdx) => {
      const globalIdx = i + cIdx;
      const authorName = await resolveUserName(c);
      const commentContent = (c.rich_text || []).map((r: any) => r.plain_text).join('').trim() || 'Pengecekan Radiasi XRF';
      const createdDate = new Date(c.created_time);
      const formattedCreated = createdDate.toISOString().replace('T', ' ').slice(0, 19);

      // Process attachments if present
      const attachmentsList = c.attachments || [];
      const driveAttachments: any[] = [];

      for (let aIdx = 0; aIdx < attachmentsList.length; aIdx++) {
        const att = attachmentsList[aIdx];
        const rawUrl = att.file?.url || att.url;
        if (!rawUrl) continue;

        let filename = `radiasi_xrf_${globalIdx}_${aIdx}.jpg`;
        try {
          const urlObj = new URL(rawUrl);
          const pathSegments = urlObj.pathname.split('/');
          filename = decodeURIComponent(pathSegments[pathSegments.length - 1]) || filename;
        } catch (e) {}

        if (driveToken) {
          try {
            console.log(`  Downloading [${globalIdx + 1}/${allComments.length}]: ${filename}...`);
            const fileRes = await fetch(rawUrl);
            if (fileRes.ok) {
              const arrayBuffer = await fileRes.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const rawMime = fileRes.headers.get('content-type') || '';
              const safeMime = (rawMime && rawMime.includes('/')) 
                ? rawMime.split(';')[0].trim() 
                : (filename.endsWith('.png') ? 'image/png' : 'image/jpeg');
              
              const uploaded = await uploadToDrive(driveToken, buffer, safeMime, filename);
              console.log(`  ✓ Uploaded to Drive: ${filename} (${uploaded.id})`);
              
              driveAttachments.push({
                id: uploaded.id,
                name: filename,
                category: 'image',
                mimeType: safeMime,
                size: buffer.length,
                driveViewUrl: `https://drive.google.com/file/d/${uploaded.id}/view?usp=drivesdk`,
                driveDownloadUrl: `https://drive.google.com/uc?id=${uploaded.id}&export=download`,
                directUrl: `https://lh3.googleusercontent.com/d/${uploaded.id}`
              });
              attachmentUploadCount++;
            }
          } catch (err: any) {
            console.warn(`  Failed attachment ${filename}:`, err.message);
          }
        }
      }

      const fileUrlVal = driveAttachments.length > 0 ? JSON.stringify(driveAttachments) : null;
      const fileNameVal = driveAttachments.length > 0 ? driveAttachments[0].name : null;

      await db.execute(sql`
        INSERT INTO bulletin_comments (
          post_id, topic_title, topic_id, section, category, content,
          author_nik, author_name, file_url, file_name, created_at
        ) VALUES (
          ${postId}, ${TOPIC_TITLE}, ${TOPIC_TITLE.toLowerCase().replace(/\s+/g, '-')},
          'Laboratorium', 'Weekly Laboratorium', ${commentContent},
          'Guest', ${authorName},
          ${fileUrlVal}, ${fileNameVal}, ${formattedCreated}
        );
      `);
      insertedCount++;
    }));
  }

  console.log(`\n✓ SUCCESS: ${insertedCount} comments inserted, ${attachmentUploadCount} attachments uploaded to Drive for Check Radiasi XRF.`);
}

run().then(() => process.exit(0)).catch((e) => {
  console.error('Fatal error during sync:', e);
  process.exit(1);
});
