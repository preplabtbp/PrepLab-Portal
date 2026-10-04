import 'dotenv/config';
import { Client } from '@notionhq/client';
import { google } from 'googleapis';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const ROOT_PAGE_ID = '12bd00c5-c809-8034-ab07-db92e45e09b8'; // PROSEDUR root page
const ROOT_GDRIVE_PARENT = '1JJZKj7X1vsNNP5dTWDYJ_-0xYVhU0Bu7'; // Shared Drive root folder
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'prosedur');
const CACHE_FILE = path.join(process.cwd(), 'scripts', 'attachments-cache.json');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Load or initialize attachment cache
let attachmentCache: Record<string, { driveId: string; driveViewUrl: string; driveDownloadUrl: string; localUrl: string; fileName: string }> = {};
if (fs.existsSync(CACHE_FILE)) {
  try {
    attachmentCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch (e) {
    attachmentCache = {};
  }
}

function saveCache() {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(attachmentCache, null, 2));
}

// Google Drive Auth
const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth });

const notion = new Client({ auth: NOTION_API_KEY });

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME
});

let targetDriveFolderId = '';

async function getOrCreateDriveFolder(folderName: string): Promise<string> {
  if (targetDriveFolderId) return targetDriveFolderId;
  try {
    const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${ROOT_GDRIVE_PARENT}' in parents and trashed=false`;
    const searchRes = await drive.files.list({
      q: query,
      fields: 'files(id, name)',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (searchRes.data.files && searchRes.data.files.length > 0) {
      targetDriveFolderId = searchRes.data.files[0].id!;
      return targetDriveFolderId;
    }

    const createRes = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [ROOT_GDRIVE_PARENT],
      },
      fields: 'id',
      supportsAllDrives: true,
    });

    targetDriveFolderId = createRes.data.id!;
    return targetDriveFolderId;
  } catch (e: any) {
    console.warn(`Could not create folder under ${ROOT_GDRIVE_PARENT}, falling back to root folder ID:`, e.message);
    targetDriveFolderId = ROOT_GDRIVE_PARENT;
    return targetDriveFolderId;
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\-]/g, '_').replace(/_+/g, '_');
}

function getMimeType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.doc')) return 'application/msword';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) return 'application/vnd.ms-powerpoint';
  if (lower.endsWith('.xls') || lower.endsWith('.xlsx')) return 'application/vnd.ms-excel';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

async function processAttachment(fileUrl: string, originalName: string): Promise<{ driveDownloadUrl: string; driveViewUrl: string; driveId: string; localUrl: string; fileName: string }> {
  const cleanName = sanitizeFilename(originalName || 'attachment.pdf');
  const cacheKey = cleanName.toLowerCase();

  if (attachmentCache[cacheKey]) {
    return attachmentCache[cacheKey];
  }

  const localFilePath = path.join(UPLOAD_DIR, cleanName);
  const localUrl = `/uploads/prosedur/${cleanName}`;

  let buffer: Buffer | null = null;

  if (fs.existsSync(localFilePath)) {
    buffer = fs.readFileSync(localFilePath);
  } else {
    try {
      console.log(`  📥 Downloading: ${cleanName}...`);
      const res = await fetch(fileUrl);
      if (res.ok) {
        buffer = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(localFilePath, buffer);
      } else {
        console.warn(`    ⚠️ Failed download from Notion: ${res.status}`);
      }
    } catch (err: any) {
      console.warn(`    ⚠️ Download error:`, err.message);
    }
  }

  let driveId = '';
  let driveViewUrl = '';
  let driveDownloadUrl = localUrl;

  if (buffer) {
    try {
      const folderId = await getOrCreateDriveFolder('Prosedur_Documents');
      console.log(`  ☁️ Uploading to Drive folder (${folderId}): ${cleanName}...`);
      const mimeType = getMimeType(cleanName);
      const res = await drive.files.create({
        requestBody: {
          name: cleanName,
          parents: [folderId],
        },
        media: {
          mimeType,
          body: fs.createReadStream(localFilePath),
        },
        fields: 'id, name, webViewLink, webContentLink',
        supportsAllDrives: true,
      });

      driveId = res.data.id || '';
      if (driveId) {
        try {
          await drive.permissions.create({
            fileId: driveId,
            requestBody: { role: 'reader', type: 'anyone' },
            supportsAllDrives: true,
          });
        } catch (e) {}

        driveViewUrl = `https://drive.google.com/file/d/${driveId}/view?usp=sharing`;
        driveDownloadUrl = `https://drive.google.com/uc?id=${driveId}&export=download`;
        console.log(`    ✓ Uploaded to Drive: ID ${driveId}`);
      }
    } catch (err: any) {
      console.warn(`    ⚠️ Google Drive upload error for ${cleanName}:`, err.message);
    }
  }

  const result = {
    driveId,
    driveViewUrl: driveViewUrl || localUrl,
    driveDownloadUrl: driveDownloadUrl || localUrl,
    localUrl,
    fileName: cleanName,
  };

  attachmentCache[cacheKey] = result;
  saveCache();
  return result;
}

function richTextToMd(richText: any[]): string {
  if (!richText || richText.length === 0) return '';
  return richText.map(t => {
    let text = t.plain_text || '';
    if (!text) return '';
    if (t.annotations?.bold) text = `**${text}**`;
    if (t.annotations?.italic) text = `*${text}*`;
    if (t.annotations?.code) text = `\`${text}\``;
    if (t.annotations?.strikethrough) text = `~~${text}~~`;
    if (t.href) text = `[${text}](${t.href})`;
    return text;
  }).join('');
}

function formatMateriTitle(fileName: string, toggleContext: string, sectionTitle: string): string {
  const nameWithoutExt = fileName.replace(/\.pdf$/i, '').trim();

  // If toggleContext is generic category (like Preparation, Laboratory, etc.), prefer fileName
  const isGenericToggle = !toggleContext || [
    'PREPARATION',
    'LABORATORY',
    'MAINTENANCE',
    'INVENTORY CONTROL',
    'MENU INFO PROSEDUR',
    'PADUAN SAMPLING DAN PREPARASI SAMPEL ORE NIKEL KPS & HJF'
  ].includes(toggleContext.toUpperCase().trim());

  let base = isGenericToggle ? nameWithoutExt : toggleContext;

  // Clean codes & numbers
  base = base.replace(/^\d+[\.\-\s]+/, '').trim();
  base = base.replace(/^TBP-(SOP|IK|JSA)-[A-Za-z0-9\.\-_]+/i, '').trim();
  base = base.replace(/^TBP-[A-Za-z0-9\.\-_]+/i, '').trim();
  base = base.replace(/_?R\.?\d+(\.\d+)?/gi, '').trim();
  base = base.replace(/^[\d\.\-_\s]+/, '').trim();
  base = base.replace(/[\d\.\-_\s]+$/, '').trim();

  const secUpper = sectionTitle.toUpperCase();
  const isIK = secUpper.includes('IK') || base.toUpperCase().startsWith('IK ');
  const isSOP = secUpper.includes('SOP') || base.toUpperCase().startsWith('SOP ');
  const isJSA = secUpper.includes('JSA') || base.toUpperCase().startsWith('JSA ');

  if (isIK) {
    if (!base.toUpperCase().startsWith('IK ')) base = `IK ${base}`;
    if (!base.toUpperCase().startsWith('PEMAHAMAN ')) base = `Pemahaman ${base}`;
  } else if (isSOP) {
    if (!base.toUpperCase().startsWith('SOP ')) base = `SOP ${base}`;
    if (!base.toUpperCase().startsWith('PEMAHAMAN ')) base = `Pemahaman ${base}`;
  } else if (isJSA) {
    if (!base.toUpperCase().startsWith('JSA ')) base = `JSA ${base}`;
  }

  return base;
}

async function upsertP5mMateri(
  client: any,
  judul: string,
  sectionTitle: string,
  toggleTitle: string,
  fileName: string,
  driveViewUrl: string,
  driveId: string,
  blockId: string
) {
  try {
    let subKategori = 'General';
    let divisi = 'All';

    const secUpper = sectionTitle.toUpperCase();
    const togUpper = toggleTitle.toUpperCase();
    const fileUpper = fileName.toUpperCase();

    if (secUpper.includes('PREPARASI') || togUpper.includes('PREPARASI') || togUpper.includes('PREPARATION') || fileUpper.includes('PREP')) {
      subKategori = 'Preparation';
      divisi = 'Preparation';
    } else if (secUpper.includes('LABORATORIUM') || togUpper.includes('LABORATORIUM') || togUpper.includes('LABORATORY') || fileUpper.includes('LAB')) {
      subKategori = 'Laboratory';
      divisi = 'Laboratory';
    } else if (togUpper.includes('MAINTENANCE') || fileUpper.includes('MNT') || fileUpper.includes('MAINTENANCE')) {
      subKategori = 'Maintenance';
      divisi = 'Maintenance';
    } else if (togUpper.includes('INVENTORY') || fileUpper.includes('IC-') || fileUpper.includes('INVENTORY')) {
      subKategori = 'General';
      divisi = 'Preparation';
    } else if (secUpper.includes('SMELTER')) {
      subKategori = 'Preparation';
      divisi = 'Preparation';
    }

    const check = await client.query(
      'SELECT id FROM p5m_materi WHERE notion_id = $1 OR file_url = $2 OR judul = $3',
      [blockId, driveViewUrl, judul]
    );

    if (check.rows.length > 0) {
      const existingId = check.rows[0].id;
      await client.query(
        `UPDATE p5m_materi
         SET judul = $1, kategori = $2, sub_kategori = $3, divisi = $4, file_url = $5, notion_id = $6
         WHERE id = $7`,
        [judul, 'Teknis', subKategori, divisi, driveViewUrl, blockId, existingId]
      );
      console.log(`    🔄 Updated p5m_materi [${divisi}]: "${judul}"`);
    } else {
      await client.query(
        `INSERT INTO p5m_materi (judul, kategori, sub_kategori, divisi, file_url, notion_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [judul, 'Teknis', subKategori, divisi, driveViewUrl, blockId]
      );
      console.log(`    ✅ Inserted p5m_materi [${divisi}]: "${judul}"`);
    }
  } catch (err: any) {
    console.warn(`    ⚠️ Error saving to p5m_materi for "${judul}":`, err.message);
  }
}

// Convert blocks recursively into Markdown with permanent file handling & p5m_materi registration
async function convertBlocksToMarkdown(
  blockId: string,
  sectionTitle: string,
  currentToggle = '',
  depth = 0,
  client: any = null
): Promise<string> {
  const parts: string[] = [];
  let cursor: string | undefined = undefined;
  let hasMore = true;

  while (hasMore) {
    try {
      const res: any = await notion.blocks.children.list({
        block_id: blockId,
        start_cursor: cursor,
        page_size: 100,
      });

      for (const b of res.results) {
        if (b.type === 'paragraph') {
          const text = richTextToMd(b.paragraph?.rich_text);
          parts.push(text ? `${text}\n\n` : '\n');
        } else if (b.type === 'heading_1') {
          const text = richTextToMd(b.heading_1?.rich_text);
          parts.push(`# ${text}\n\n`);
        } else if (b.type === 'heading_2') {
          const text = richTextToMd(b.heading_2?.rich_text);
          parts.push(`## ${text}\n\n`);
        } else if (b.type === 'heading_3') {
          const text = richTextToMd(b.heading_3?.rich_text);
          parts.push(`### ${text}\n\n`);
        } else if (b.type === 'bulleted_list_item') {
          const text = richTextToMd(b.bulleted_list_item?.rich_text);
          parts.push(`- ${text}\n`);
          if (b.has_children) {
            const childMd = await convertBlocksToMarkdown(b.id, sectionTitle, currentToggle, depth + 1, client);
            parts.push(childMd.split('\n').map((l: string) => l ? `  ${l}` : '').join('\n') + '\n');
          }
        } else if (b.type === 'numbered_list_item') {
          const text = richTextToMd(b.numbered_list_item?.rich_text);
          parts.push(`1. ${text}\n`);
          if (b.has_children) {
            const childMd = await convertBlocksToMarkdown(b.id, sectionTitle, currentToggle, depth + 1, client);
            parts.push(childMd.split('\n').map((l: string) => l ? `  ${l}` : '').join('\n') + '\n');
          }
        } else if (b.type === 'to_do') {
          const text = richTextToMd(b.to_do?.rich_text);
          const checked = b.to_do?.checked ? '[x]' : '[ ]';
          parts.push(`- ${checked} ${text}\n`);
        } else if (b.type === 'quote') {
          const text = richTextToMd(b.quote?.rich_text);
          parts.push(`> ${text}\n\n`);
        } else if (b.type === 'divider') {
          parts.push(`---\n\n`);
        } else if (b.type === 'callout') {
          const text = richTextToMd(b.callout?.rich_text);
          const icon = b.callout?.icon?.emoji || '💡';
          parts.push(`> ${icon} **INFO**: ${text}\n\n`);
          if (b.has_children) {
            const childMd = await convertBlocksToMarkdown(b.id, sectionTitle, currentToggle, depth + 1, client);
            parts.push(childMd);
          }
        } else if (b.type === 'file' || b.type === 'pdf') {
          const fileObj = b[b.type];
          const rawUrl = fileObj?.file?.url || fileObj?.external?.url;
          const fileName = fileObj?.name || `${currentToggle || 'document'}.pdf`;
          if (rawUrl) {
            const processed = await processAttachment(rawUrl, fileName);
            parts.push(`\n\n> 📥 **Dokumen**: [${processed.fileName}](${processed.driveDownloadUrl}) | 👁️ [Lihat di Drive](${processed.driveViewUrl})\n\n`);

            // Also register to p5m_materi if it's a PDF
            if (client && (fileName.toLowerCase().endsWith('.pdf') || processed.fileName.toLowerCase().endsWith('.pdf'))) {
              const materiJudul = formatMateriTitle(fileName, currentToggle, sectionTitle);
              await upsertP5mMateri(
                client,
                materiJudul,
                sectionTitle,
                currentToggle,
                fileName,
                processed.driveViewUrl,
                processed.driveId,
                b.id
              );
            }
          }
        } else if (b.type === 'image') {
          const imgObj = b.image;
          const rawUrl = imgObj?.file?.url || imgObj?.external?.url;
          const caption = richTextToMd(imgObj?.caption) || 'Gambar';
          if (rawUrl) {
            const processed = await processAttachment(rawUrl, `${caption || 'image'}.png`);
            parts.push(`\n\n![${caption}](${processed.driveDownloadUrl})\n\n`);
          }
        } else if (b.type === 'toggle') {
          const toggleTitle = richTextToMd(b.toggle?.rich_text) || 'Informasi Tambahan';
          parts.push(`\n\n### 📌 ${toggleTitle}\n\n`);
          if (b.has_children) {
            const childMd = await convertBlocksToMarkdown(b.id, sectionTitle, toggleTitle, depth + 1, client);
            parts.push(childMd);
          }
        } else if (b.type === 'column_list' || b.type === 'column') {
          if (b.has_children) {
            const childMd = await convertBlocksToMarkdown(b.id, sectionTitle, currentToggle, depth, client);
            parts.push(childMd);
          }
        } else if (b.type === 'link_to_page') {
          parts.push(`\n- 🔗 **Lihat Halaman Terkait**\n`);
        } else if (b.type === 'child_page') {
          const childTitle = b.child_page?.title || 'Sub-Halaman';
          parts.push(`\n- 📄 **[${childTitle}](#)**\n`);
        }
      }

      hasMore = res.has_more;
      cursor = res.next_cursor;
    } catch (err: any) {
      console.warn(`    ⚠️ Error reading blocks for ${blockId}:`, err.message);
      break;
    }
  }

  return parts.join('');
}

// Master list of PROSEDUR pages to synchronize
const PROSEDUR_PAGES = [
  { id: '12bd00c5-c809-8034-ab07-db92e45e09b8', title: 'PROSEDUR', isRoot: true },
  { id: '12bd00c5-c809-8060-a627-c02340d2da4c', title: 'SOP Preparasi' },
  { id: '2cbd00c5-c809-80ae-b82f-c01cb27fd050', title: 'JSA' },
  { id: '171d00c5-c809-80f4-88c7-d25724088711', title: 'SOP Laboratorium' },
  { id: '171d00c5-c809-8014-a587-dc9c7b0a124e', title: 'SOP Smelter' },
  { id: '12bd00c5-c809-8057-8957-f015eec446ea', title: 'IK Preparasi' },
  { id: '12bd00c5-c809-80ad-b7e2-f7f3da841425', title: 'IK Laboratorium' },
  { id: '12ed00c5-c809-800c-a5ff-e8fed2fc6c77', title: 'Flow Chart' },
  { id: '792a935a-f014-4de6-9139-415e59e109d4', title: 'Guidance' }
];

async function syncProsedur() {
  console.log(`\n================================================================`);
  console.log(`🚀 SINKRONISASI NOTION: PROSEDUR MODULE, MATERI & ATTACHMENTS`);
  console.log(`================================================================\n`);

  const client = await pool.connect();

  // Clean any generic JSA placeholders if any were inserted
  await client.query("DELETE FROM p5m_materi WHERE judul IN ('JSA Preparation', 'JSA Laboratory', 'JSA Maintenance', 'JSA Inventory Control')");

  for (let i = 0; i < PROSEDUR_PAGES.length; i++) {
    const item = PROSEDUR_PAGES[i];
    console.log(`\n[${i + 1}/${PROSEDUR_PAGES.length}] Mengolah Halaman: "${item.title}" (${item.id})...`);

    try {
      const pageInfo: any = await notion.pages.retrieve({ page_id: item.id });
      const coverImg = pageInfo.cover?.external?.url || pageInfo.cover?.file?.url || 'https://images.unsplash.com/photo-1596464750157-3965eeddc923?auto=format&fit=crop&w=1200&q=80';

      let cleanTitle = item.title.trim();
      const propTitle = pageInfo.properties?.title?.title?.[0]?.plain_text || pageInfo.properties?.Name?.title?.[0]?.plain_text;
      if (propTitle && propTitle.trim()) {
        cleanTitle = propTitle.trim();
      }

      // Convert all blocks and files in this page
      let md = await convertBlocksToMarkdown(item.id, cleanTitle, '', 0, client);

      // If it's the root PROSEDUR page, prepend an organized navigation header
      if (item.isRoot) {
        let rootHeader = `# 📚 MODUL PROSEDUR & STANDAR OPERASIONAL (SOP, IK & JSA)\n\n`;
        rootHeader += `> **Departemen**: Preparation & Laboratory (PT. Trimegah Bangun Persada & Gane Permai Sentosa)\n`;
        rootHeader += `> **Pusat Akses**: Standar Operasional Prosedur (SOP), Instruksi Kerja (IK), Job Safety Analysis (JSA), & Flowchart\n\n`;
        rootHeader += `---\n\n`;

        rootHeader += `## 📑 DIREKTORI MODUL PROSEDUR KERJA\n\n`;
        rootHeader += `- 📄 **[SOP Preparasi](#)** - Standar Operasional Prosedur Preparation (Basah, Kering, Grade Control, Eksplorasi, Moisture, Screen Test)\n`;
        rootHeader += `- 🔬 **[SOP Laboratorium](#)** - Standar Operasional Prosedur Laboratorium (Press Powder, ED-XRF Epsilon, LOI, Fused Bead, WD-XRF Zetium, B3)\n`;
        rootHeader += `- 🏭 **[SOP Smelter](#)** - Panduan Sampling & Preparasi Sampel Ore Nikel KPS & HJF\n`;
        rootHeader += `- 🛠️ **[IK Preparasi](#)** - Instruksi Kerja Mesin Crusher, Pulverizer, Oven Kontainer, Mixer Type V, Kompressor, dsb.\n`;
        rootHeader += `- 🧪 **[IK Laboratorium](#)** - Instruksi Kerja 17 Alat Laboratorium (XRF, LOI, Balance, Ultrasonic, Mould, Platinum Ware, dll.)\n`;
        rootHeader += `- 📊 **[Flow Chart](#)** - Bagan Alur Proses Kerja Preparasi & Laboratorium Terstandarisasi\n`;
        rootHeader += `- 🛡️ **[JSA (Job Safety Analysis)](#)** - Analisa Keselamatan Kerja Preparation, Laboratory, Maintenance & Inventory Control\n`;
        rootHeader += `- 💡 **[Guidance](#)** - Petunjuk Teknis & Fitur Dukungan Kerja Cepat\n\n`;

        rootHeader += `---\n\n`;
        md = rootHeader + md;
      }

      // Upsert into bulletin_posts
      await client.query(`
        INSERT INTO bulletin_posts (title, notion_id, cover_image, department, category, content, pt, universe, original_created_at)
        VALUES ($1, $2, $3, 'Prep & Lab', 'PROSEDUR', $4, 'TBP', 'TBP_GPS', $5)
        ON CONFLICT (notion_id) DO UPDATE SET
          title = EXCLUDED.title,
          cover_image = EXCLUDED.cover_image,
          department = EXCLUDED.department,
          category = EXCLUDED.category,
          content = EXCLUDED.content,
          pt = EXCLUDED.pt,
          universe = EXCLUDED.universe
      `, [cleanTitle, item.id, coverImg, md, new Date(pageInfo.created_time || Date.now())]);

      console.log(`  ✓ Berhasil disinkronkan ke bulletin_posts: "${cleanTitle}" (${md.length} karakter)`);
    } catch (err: any) {
      console.error(`  ✗ Gagal sinkronisasi ${item.title}:`, err.message);
    }
  }

  client.release();
  await pool.end();
  saveCache();

  console.log(`\n================================================================`);
  console.log(`🎉 SEMUA DOKUMEN PROSEDUR, MATERI P5M & ATTACHMENT BERHASIL DISINKRONISASIKAN!`);
  console.log(`================================================================\n`);
}

syncProsedur().catch(err => {
  console.error('Fatal synchronization error:', err);
  process.exit(1);
});
