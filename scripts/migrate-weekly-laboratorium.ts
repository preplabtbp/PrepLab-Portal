import { Client } from '@notionhq/client';
import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const PAGE_ID = '12ad00c5-c809-8159-96c3-f661b0afb522';
const BULLETIN_FOLDER_ID = process.env.GDRIVE_BULLETIN_ATTACHMENTS_FOLDER_ID || '1JE6EusixbK7saIzboKNOk9aMiAqEX-zF';

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
    signal: AbortSignal.timeout(25000)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));

  // Set file permissions so it is publicly accessible
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

async function resolveUserName(userId: string): Promise<string> {
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

async function migrateWeeklyLaboratorium() {
  console.log('=== STARTING MIGRATION: Weekly Laboratorium ===');
  const page: any = await notion.pages.retrieve({ page_id: PAGE_ID });
  const coverImg = page.cover?.external?.url || page.cover?.file?.url || null;
  const pageTitle = page.properties?.title?.title?.[0]?.plain_text || 'Weekly Laboratorium';
  const originalCreated = new Date(page.created_time);

  console.log(`Page: "${pageTitle}" (${PAGE_ID})`);

  let driveToken: string | null = null;
  try {
    driveToken = await getDriveToken();
    console.log('✓ Google Drive authenticated');
  } catch (e: any) {
    console.warn('Drive auth warning:', e.message);
  }

  // Check if post already exists or create it first
  let postId: number;
  const existing = await db.execute(sql`
    SELECT id FROM bulletin_posts WHERE notion_id = ${PAGE_ID} LIMIT 1;
  `);

  if (existing.rows.length > 0) {
    postId = Number(existing.rows[0].id);
    console.log(`Found existing post ID #${postId}`);
  } else {
    const inserted = await db.execute(sql`
      INSERT INTO bulletin_posts (
        title, notion_id, cover_image, department, category, content, pt, universe, original_created_at
      ) VALUES (
        ${pageTitle}, ${PAGE_ID}, ${coverImg}, 'Lab', 'Laboratorium', 'Memuat konten...', 'TBP', 'TBP_GPS', ${originalCreated}
      ) RETURNING id;
    `);
    postId = Number(inserted.rows[0].id);
    console.log(`Created new post ID #${postId}`);
  }

  // Clear existing comments for this post to prevent duplicates upon re-run
  await db.execute(sql`
    DELETE FROM bulletin_comments WHERE post_id = ${postId};
  `);
  console.log(`Cleared previous comments for post #${postId}`);

  // Retrieve blocks from Notion
  const blocks = await notion.blocks.children.list({ block_id: PAGE_ID, page_size: 100 });
  const dbBlocks = blocks.results.filter((b: any) => b.type === 'child_database');

  let fullContent = '';

  for (const dbBlock of dbBlocks as any[]) {
    const dbTitle = dbBlock.child_database?.title || 'Weekly Laboratorium';
    console.log(`\nExtracting Database: "${dbTitle}" (${dbBlock.id})`);

    let hasMore = true;
    let cursor: string | undefined = undefined;
    const allRows: any[] = [];

    while (hasMore) {
      const dbQuery = await notion.databases.query({
        database_id: dbBlock.id,
        start_cursor: cursor,
        page_size: 100
      });
      allRows.push(...dbQuery.results);
      hasMore = dbQuery.has_more;
      cursor = dbQuery.next_cursor || undefined;
    }

    console.log(`Total rows retrieved: ${allRows.length}`);

    if (allRows.length > 0) {
      const columns = [
        'number',
        'Jenis kegiatan',
        'Keterangan',
        'PIC',
        'Priority',
        'Status',
        'Created Time',
        'Kategori',
        'Activity (routine/non routine)',
        'period'
      ];

      let tableMd = `### 📊 ${dbTitle}\n\n`;
      tableMd += '| ' + columns.join(' | ') + ' |\n';
      tableMd += '| ' + columns.map(() => '---').join(' | ') + ' |\n';

      for (let i = 0; i < allRows.length; i++) {
        const row: any = allRows[i];
        const p = row.properties;
        const titleProp = Object.keys(p).find(k => p[k]?.type === 'title');
        const topicTitle = (titleProp && p[titleProp]?.title?.[0]?.plain_text) || 'Untitled Topic';

        console.log(`\n  [Row ${i + 1}/${allRows.length}] "${topicTitle}" (${row.id})`);

        // Check comments on this row
        try {
          const rowComments = await notion.comments.list({ block_id: row.id });
          for (const c of rowComments.results as any[]) {
            let author = 'Personil Laboratorium';
            if (c.created_by?.name) {
              author = c.created_by.name;
            } else if (c.created_by?.id) {
              author = await resolveUserName(c.created_by.id);
            }

            const text = c.rich_text?.map((t: any) => t.plain_text).join('') || '';
            const commentCreated = new Date(c.created_time);

            await db.execute(sql`
              INSERT INTO bulletin_comments (
                post_id, topic_title, section, category, author_name, author_nik, content, file_url, created_at
              ) VALUES (
                ${postId}, ${topicTitle}, 'Laboratorium', 'Weekly Laboratorium', ${author}, 'NOTION_MIGRATION', ${text}, NULL, ${commentCreated}
              )
            `);
          }
        } catch(e) {}

        const getPropVal = (nameAliases: string[], typePreference?: string) => {
          for (const name of nameAliases) {
            const matchKey = Object.keys(p).find(k => k.toLowerCase().trim() === name.toLowerCase().trim());
            if (matchKey && p[matchKey]) {
              const prop = p[matchKey];
              try {
                if (prop.type === 'title') return prop.title?.map((t: any) => t.plain_text).join('') || '-';
                if (prop.type === 'rich_text') return prop.rich_text?.map((t: any) => t.plain_text).join('') || '-';
                if (prop.type === 'select') return prop.select?.name || '-';
                if (prop.type === 'status') return prop.status?.name || '-';
                if (prop.type === 'multi_select') return prop.multi_select?.map((s: any) => s.name).join(', ') || '-';
                if (prop.type === 'date') return prop.date?.start ? (prop.date.end ? `${prop.date.start} s/d ${prop.date.end}` : prop.date.start) : '-';
                if (prop.type === 'checkbox') return prop.checkbox ? '✅ Ya' : '❌ Tidak';
                if (prop.type === 'number') return String(prop.number ?? '-');
                if (prop.type === 'url') return prop.url ? `[Link](${prop.url})` : '-';
                if (prop.type === 'email') return prop.email || '-';
                if (prop.type === 'phone_number') return prop.phone_number || '-';
                if (prop.type === 'people') return prop.people?.map((peo: any) => peo.name).join(', ') || '-';
              } catch (e) {
                return '-';
              }
            }
          }
          return '-';
        };

        const numVal = String(i + 1);
        const jenisKegiatanVal = topicTitle;
        const keteranganVal = getPropVal(['Keterangan', 'Catatan', 'Deskripsi', 'Remarks', 'Content']);
        const picVal = getPropVal(['PIC', 'Assignee', 'Penanggung Jawab', 'Personil']);
        const priorityVal = getPropVal(['Priority', 'Prioritas']);
        const statusVal = getPropVal(['Status']);
        
        let createdTimeVal = '-';
        if (row.created_time) {
          const d = new Date(row.created_time);
          if (!isNaN(d.getTime())) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const h = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');
            createdTimeVal = `${y}-${m}-${day} ${h}:${min}`;
          }
        }

        const kategoriVal = getPropVal(['Kategori', 'Category', 'Dept']) || 'Laboratorium';
        const activityVal = getPropVal(['Activity (routine/non routine)', 'Aktivitas', 'Activity']);
        const periodVal = getPropVal(['period', 'Period', 'Periode']);

        const cells = [
          numVal,
          jenisKegiatanVal,
          keteranganVal,
          picVal,
          priorityVal,
          statusVal,
          createdTimeVal,
          kategoriVal,
          activityVal,
          periodVal
        ];

        tableMd += '| ' + cells.map(c => String(c).replace(/\|/g, '\\|').replace(/\n/g, ' • ').trim()).join(' | ') + ' |\n';
      }

      fullContent += tableMd;
    }
  }

  // Update post in PostgreSQL bulletin_posts
  await db.execute(sql`
    UPDATE bulletin_posts SET
      title = ${pageTitle},
      notion_id = ${PAGE_ID},
      cover_image = ${coverImg},
      department = 'Lab',
      category = 'Laboratorium',
      content = ${fullContent},
      pt = 'TBP',
      universe = 'TBP_GPS',
      original_created_at = ${originalCreated}
    WHERE id = ${postId};
  `);

  console.log(`\n🎉 MIGRATION OF WEEKLY LABORATORIUM COMPLETE (Post #${postId}, Content Length: ${fullContent.length} chars)!`);
  process.exit(0);
}

migrateWeeklyLaboratorium().catch(err => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
