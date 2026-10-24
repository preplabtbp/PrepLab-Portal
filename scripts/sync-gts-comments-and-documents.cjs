require('dotenv').config();
const { Client: Notion } = require('@notionhq/client');
const { Pool } = require('pg');

const notion = new Notion({ auth: process.env.NOTION_API_KEY });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Priority column order for markdown tables matching TBP schema
const PRIORITY_ORDER = [
  'number', 'no',
  'jenis kegiatan', 'kegiatan', 'activity name', 'title', 'nama',
  'keterangan', 'description', 'remarks',
  'pic',
  'priority', 'prioritas',
  'status',
  'created time', 'created_time',
  'lampiran', 'file', 'dokumen', 'files',
  'aktivitas', 'activity (routine/non routine)',
  'target selesai', 'due date', 'deadline',
  'aktual selesai', 'tanggal selesai', 'completion date',
  'period', 'weekly',
  'kategori', 'category', 'section'
];

function getColumnPriority(name) {
  const lower = name.toLowerCase().trim();
  const idx = PRIORITY_ORDER.findIndex(p => lower === p || lower.includes(p));
  return idx === -1 ? 999 : idx;
}

function getPropertyValue(prop) {
  if (!prop) return '-';
  switch (prop.type) {
    case 'title':
      return prop.title?.map(t => t.plain_text).join('').replace(/\|/g, '/') || '-';
    case 'rich_text':
      return prop.rich_text?.map(t => t.plain_text).join('').replace(/\|/g, '/') || '-';
    case 'number':
      return prop.number !== null && prop.number !== undefined ? String(prop.number) : '-';
    case 'select':
      return prop.select?.name?.replace(/\|/g, '/') || '-';
    case 'multi_select':
      return prop.multi_select?.map(s => s.name).join(', ').replace(/\|/g, '/') || '-';
    case 'date':
      if (!prop.date?.start) return '-';
      return prop.date.end ? `${prop.date.start} ~ ${prop.date.end}` : prop.date.start;
    case 'checkbox':
      return prop.checkbox ? '✅' : '❌';
    case 'status':
      return prop.status?.name?.replace(/\|/g, '/') || '-';
    case 'created_time': {
      const d = new Date(prop.created_time);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const h = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${day} ${h}:${min}`;
      }
      return '-';
    }
    case 'last_edited_time':
      return new Date(prop.last_edited_time).toISOString().replace('T', ' ').substring(0, 16);
    case 'people':
      return prop.people?.map(p => p.name || p.id).join(', ') || '-';
    case 'url':
      return prop.url ? `[Link](${prop.url})` : '-';
    case 'files': {
      if (!prop.files || prop.files.length === 0) return '-';
      return prop.files.map(f => {
        const name = (f.name || 'Dokumen').replace(/\|/g, '-');
        const url = f.file?.url || f.external?.url || '#';
        return `[📄 ${name}](${url})`;
      }).join(', ');
    }
    case 'email':
      return prop.email || '-';
    case 'phone_number':
      return prop.phone_number || '-';
    default:
      return '-';
  }
}

function normalizeSubtasksInText(rawText) {
  if (!rawText || rawText === '-') return '-';
  const lines = rawText.split('\n');
  const processed = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('- [ ]') || trimmed.startsWith('- [x]')) {
      return trimmed;
    }
    const lower = trimmed.toLowerCase();
    if (lower.startsWith('(done)') || lower.startsWith('[done]')) {
      return `- [x] ${trimmed.replace(/^\([dD][oO][nN][eE]\)\s*|^\[[dD][oO][nN][eE]\]\s*/, '')}`;
    }
    if (lower.startsWith('(open)') || lower.startsWith('[open]')) {
      return `- [ ] ${trimmed.replace(/^\([oO][pP][eE][nN]\)\s*|^\[[oO][pP][eE][nN]\]\s*/, '')}`;
    }
    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      return `- [ ] ${bulletMatch[1].trim()}`;
    }
    return trimmed;
  });
  return processed.filter(Boolean).join('<br/>') || '-';
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchBlockChildren(blockId) {
  let allResults = [];
  let cursor = undefined;
  do {
    const res = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      start_cursor: cursor
    });
    allResults = allResults.concat(res.results || []);
    cursor = res.has_more ? res.next_cursor : undefined;
    if (cursor) await sleep(80);
  } while (cursor);
  return allResults;
}

async function queryAllDatabaseRows(databaseId) {
  let allRows = [];
  let cursor = undefined;
  do {
    const res = await notion.databases.query({
      database_id: databaseId,
      page_size: 100,
      start_cursor: cursor
    });
    allRows = allRows.concat(res.results || []);
    cursor = res.has_more ? res.next_cursor : undefined;
    if (cursor) await sleep(80);
  } while (cursor);
  return allRows;
}

async function convertDatabaseToMarkdownTable(databaseId, dbTitle) {
  const dbInfo = await notion.databases.retrieve({ database_id: databaseId });
  const rows = await queryAllDatabaseRows(databaseId);

  if (rows.length === 0) {
    return { md: `### ${dbTitle}\n\n*Belum ada data kegiatan.*\n\n`, rows: [] };
  }

  const propKeys = Object.keys(dbInfo.properties || {});
  let titleKey = propKeys.find(k => dbInfo.properties[k]?.type === 'title') || 'Jenis Kegiatan';

  const filteredKeys = propKeys.filter(k => {
    const t = dbInfo.properties[k]?.type;
    const lower = k.toLowerCase().trim();
    if (['parent item', 'sub-item', 'parent_item', 'sub_item'].includes(lower)) return false;
    return ['title', 'rich_text', 'select', 'multi_select', 'date', 'checkbox', 'number', 'status', 'created_time', 'people', 'url', 'files'].includes(t);
  });

  const sortedKeys = [...filteredKeys].sort((a, b) => {
    return getColumnPriority(a) - getColumnPriority(b);
  });

  const displayHeaders = sortedKeys.map(k => {
    const t = dbInfo.properties[k]?.type;
    if (t === 'title' && (!k.trim() || k.trim() === 'title')) {
      return 'Jenis Kegiatan';
    }
    return k.trim() || 'Jenis Kegiatan';
  });

  let md = `### ${dbTitle}\n\n`;
  md += '| ' + displayHeaders.join(' | ') + ' |\n';
  md += '| ' + displayHeaders.map(() => '---').join(' | ') + ' |\n';

  let rowIdx = 0;
  const processedRows = [];

  for (const row of rows) {
    const p = row.properties;
    const titleVal = getPropertyValue(p[titleKey]);
    const safeTitleSlug = titleVal.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30);
    const taskIdTag = ` <!--task-id:task_gts_${rowIdx}_${safeTitleSlug}-->`;
    const taskIdClean = `task_gts_${rowIdx}_${safeTitleSlug}`;

    const cells = sortedKeys.map(key => {
      const prop = p[key];
      let val = getPropertyValue(prop);

      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('keterangan') || lowerKey.includes('description') || lowerKey.includes('remarks')) {
        val = normalizeSubtasksInText(val);
      }

      if ((lowerKey === 'number' || lowerKey === 'no') && (val === '-' || !val)) {
        val = String(rowIdx + 1);
      }

      return String(val).replace(/\|/g, '\\|').trim();
    });

    const titleColIdx = sortedKeys.indexOf(titleKey);
    if (titleColIdx !== -1) {
      cells[titleColIdx] = cells[titleColIdx] + taskIdTag;
    }

    md += '| ' + cells.join(' | ') + ' |\n';
    processedRows.push({
      rowId: row.id,
      title: titleVal,
      taskId: taskIdClean,
      index: rowIdx
    });
    rowIdx++;
  }

  return { md: md + '\n', rows: processedRows };
}

async function main() {
  console.log('===============================================================');
  console.log('🚀 MEMULAI SINKRONISASI KOMENTAR & DOKUMEN NOTION UNIVERSE GTS');
  console.log('===============================================================\n');

  const client = await pool.connect();

  try {
    // 1. Preload Employee NIKs
    const empRes = await client.query('SELECT nik, name FROM employees WHERE pt = \'GTS\' OR pt = \'TBP\'');
    const employeeMap = new Map();
    empRes.rows.forEach(e => {
      if (e.name) {
        employeeMap.set(e.name.toLowerCase().trim(), e.nik);
      }
    });

    // 2. Preload Notion Users Cache
    const userCache = new Map();
    try {
      const uRes = await notion.users.list({});
      uRes.results.forEach(u => {
        if (u.id) userCache.set(u.id, u.name || 'User');
      });
    } catch {}

    const getUserName = async (userId, fallback = 'Pengguna GTS') => {
      if (!userId) return fallback;
      if (userCache.has(userId)) return userCache.get(userId);
      try {
        const u = await notion.users.retrieve({ user_id: userId });
        const name = u.name || fallback;
        userCache.set(userId, name);
        return name;
      } catch {
        return fallback;
      }
    };

    // 3. Query all GTS posts from database
    const postsRes = await client.query(`
      SELECT id, notion_id, title, department, category, content 
      FROM bulletin_posts 
      WHERE universe = 'GTS'
      ORDER BY id
    `);
    console.log(`📋 Total GTS Posts di Database: ${postsRes.rows.length}\n`);

    let totalCommentsInserted = 0;
    let totalPostsWithComments = 0;
    let totalPostsWithFilesUpdated = 0;

    for (let pIdx = 0; pIdx < postsRes.rows.length; pIdx++) {
      const post = postsRes.rows[pIdx];
      if (!post.notion_id) continue;

      const progressPrefix = `[${pIdx + 1}/${postsRes.rows.length}] Post #${post.id} "${post.title}"`;
      let postCommentsCount = 0;
      let postContentModified = false;
      let currentContent = post.content || '';

      // --- A. Sync Page-Level Document/PDF Blocks ---
      try {
        const pageBlocks = await fetchBlockChildren(post.notion_id);
        const docBlocks = pageBlocks.filter(b => ['file', 'pdf'].includes(b.type));
        
        if (docBlocks.length > 0) {
          const docLinks = [];
          for (const db of docBlocks) {
            const fObj = db[db.type];
            const name = fObj.name || (db.type === 'pdf' ? 'Dokumen PDF' : 'Berkas Lampiran');
            const url = fObj.file?.url || fObj.external?.url;
            if (url && !currentContent.includes(name)) {
              docLinks.push(`- 📄 **[${name}](${url})**`);
            }
          }

          if (docLinks.length > 0) {
            const docSection = `\n\n### 📎 Dokumen & Berkas Terlampir\n\n` + docLinks.join('\n') + `\n\n`;
            currentContent = docSection + currentContent;
            postContentModified = true;
            console.log(`  📎 Menambahkan ${docLinks.length} lampiran dokumen berkas ke halaman`);
          }
        }

        // --- B. Scan Child Databases for Comments & Files ---
        const childDbs = pageBlocks.filter(b => b.type === 'child_database');
        for (const cdb of childDbs) {
          const dbTitle = cdb.child_database?.title || post.title || 'Database';
          const { md: updatedTableMd, rows: tableRows } = await convertDatabaseToMarkdownTable(cdb.id, dbTitle);
          await sleep(100);

          // If table has files property and differs from currentContent, refresh table in content
          if (updatedTableMd.includes('[📄 ') && !currentContent.includes('[📄 ')) {
            // Replace old table or append
            currentContent += `\n\n${updatedTableMd}`;
            postContentModified = true;
            console.log(`  📂 Memperbarui tabel "${dbTitle}" dengan tautan dokumen berkas`);
          }

          // Fetch comments on each row of this database!
          for (const rowItem of tableRows) {
            try {
              const comms = await notion.comments.list({ block_id: rowItem.rowId });
              await sleep(60);

              if (comms.results.length > 0) {
                for (const c of comms.results) {
                  const authorName = c.display_name?.resolved_name || await getUserName(c.created_by?.id, 'Personil GTS');
                  const authorNik = employeeMap.get(authorName.toLowerCase().trim()) || '00000000000';
                  const commentText = c.rich_text?.map(t => t.plain_text).join('').trim() || '';

                  // Check attachments in comment
                  let fileUrl = null;
                  let fileName = null;
                  if (c.attachments && c.attachments.length > 0) {
                    const att = c.attachments[0];
                    fileUrl = att.file?.url || att.external?.url || null;
                    fileName = att.file?.name || (att.category === 'image' ? 'Lampiran Gambar.png' : 'Lampiran Berkas.pdf');
                  }

                  // Check if comment already inserted in DB
                  const existingComm = await client.query(`
                    SELECT id FROM bulletin_comments 
                    WHERE post_id = $1 AND author_name = $2 AND content = $3 AND topic_title = $4
                    LIMIT 1
                  `, [post.id, authorName, commentText, rowItem.title]);

                  if (existingComm.rows.length === 0) {
                    await client.query(`
                      INSERT INTO bulletin_comments (
                        universe, post_id, topic_title, topic_id, section, category,
                        author_nik, author_name, content, file_url, file_name, created_at
                      ) VALUES (
                        'GTS', $1, $2, $3, $4, $5,
                        $6, $7, $8, $9, $10, $11
                      )
                    `, [
                      post.id,
                      rowItem.title,
                      rowItem.taskId,
                      post.department || 'General',
                      post.category || 'INFO::1',
                      authorNik,
                      authorName,
                      commentText || (fileName ? `[Mengunggah berkas: ${fileName}]` : 'Komentar'),
                      fileUrl,
                      fileName,
                      c.created_time ? new Date(c.created_time) : new Date()
                    ]);
                    totalCommentsInserted++;
                    postCommentsCount++;
                  }
                }
              }
            } catch (err) {
              // Ignore row-level comment error and continue
            }
          }
        }
      } catch (e) {
        // Ignore block children retrieval error
      }

      // --- C. Check Page-Level Comments (if any) ---
      try {
        const pageComments = await notion.comments.list({ block_id: post.notion_id });
        await sleep(60);
        if (pageComments.results.length > 0) {
          for (const c of pageComments.results) {
            const authorName = c.display_name?.resolved_name || await getUserName(c.created_by?.id, 'Personil GTS');
            const authorNik = employeeMap.get(authorName.toLowerCase().trim()) || '00000000000';
            const commentText = c.rich_text?.map(t => t.plain_text).join('').trim() || '';

            let fileUrl = null;
            let fileName = null;
            if (c.attachments && c.attachments.length > 0) {
              const att = c.attachments[0];
              fileUrl = att.file?.url || att.external?.url || null;
              fileName = att.file?.name || 'Lampiran.pdf';
            }

            const existingComm = await client.query(`
              SELECT id FROM bulletin_comments 
              WHERE post_id = $1 AND author_name = $2 AND content = $3
              LIMIT 1
            `, [post.id, authorName, commentText]);

            if (existingComm.rows.length === 0) {
              await client.query(`
                INSERT INTO bulletin_comments (
                  universe, post_id, topic_title, topic_id, section, category,
                  author_nik, author_name, content, file_url, file_name, created_at
                ) VALUES (
                  'GTS', $1, $2, NULL, $3, $4,
                  $5, $6, $7, $8, $9, $10
                )
              `, [
                post.id,
                post.title,
                post.department || 'General',
                post.category || 'INFO::1',
                authorNik,
                authorName,
                commentText || (fileName ? `[Mengunggah berkas: ${fileName}]` : 'Komentar'),
                fileUrl,
                fileName,
                c.created_time ? new Date(c.created_time) : new Date()
              ]);
              totalCommentsInserted++;
              postCommentsCount++;
            }
          }
        }
      } catch (e) {}

      if (postCommentsCount > 0) {
        totalPostsWithComments++;
        console.log(`  💬 ${progressPrefix} -> Berhasil sinkronisasi ${postCommentsCount} komentar`);
      }

      // --- D. Save updated post content if modified ---
      if (postContentModified) {
        await client.query(`
          UPDATE bulletin_posts 
          SET content = $1
          WHERE id = $2
        `, [currentContent, post.id]);
        totalPostsWithFilesUpdated++;
      }
    }

    console.log('\n===============================================================');
    console.log('✅ SINKRONISASI KOMENTAR & DOKUMEN GTS SELESAI!');
    console.log(`💬 Total Komentar Baru Disinkronkan: ${totalCommentsInserted}`);
    console.log(`📑 Total Postingan dengan Komentar: ${totalPostsWithComments}`);
    console.log(`📎 Total Postingan dengan Berkas/Dokumen Diperbarui: ${totalPostsWithFilesUpdated}`);
    console.log('===============================================================\n');

  } catch (err) {
    console.error('Fatal error during sync:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
