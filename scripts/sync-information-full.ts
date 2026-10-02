import 'dotenv/config';
import { Client } from '@notionhq/client';
import { google } from 'googleapis';
import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const ROOT_PAGE_ID = '12bd00c5-c809-8006-a5a8-fb55eb68f5d8';
const GDRIVE_FOLDER_ID = process.env.GDRIVE_BULLETIN_ATTACHMENTS_FOLDER_ID || '1JE6EusixbK7saIzboKNOk9aMiAqEX-zF';
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'notion');
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

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\-]/g, '_').replace(/_+/g, '_');
}

function getMimeType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.doc')) return 'application/msword';
  if (lower.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (lower.endsWith('.ppt')) return 'application/vnd.ms-powerpoint';
  if (lower.endsWith('.pptx')) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  if (lower.endsWith('.xls')) return 'application/vnd.ms-excel';
  if (lower.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

// Download file from Notion S3 and optionally upload to Google Drive
async function processAttachment(fileUrl: string, originalName: string): Promise<{ driveDownloadUrl: string; driveViewUrl: string; localUrl: string; fileName: string }> {
  // Extract a stable key from Notion S3 url or filename
  const cleanName = sanitizeFilename(originalName || 'attachment.pdf');
  const cacheKey = cleanName.toLowerCase();

  if (attachmentCache[cacheKey]) {
    return attachmentCache[cacheKey];
  }

  const localFilePath = path.join(UPLOAD_DIR, cleanName);
  const localUrl = `/uploads/notion/${cleanName}`;

  let buffer: Buffer | null = null;

  // Check if file already exists locally
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
      console.log(`  ☁️ Uploading to Drive: ${cleanName}...`);
      const mimeType = getMimeType(cleanName);
      const res = await drive.files.create({
        requestBody: {
          name: cleanName,
          parents: [GDRIVE_FOLDER_ID],
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
        // Set public read permission
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

// Convert rich_text array to Markdown string
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

// Query Notion database and render as structured Markdown table
async function convertDatabaseToMarkdown(databaseId: string, title: string): Promise<string> {
  console.log(`  📊 Extracting Database: "${title}" (${databaseId})...`);
  try {
    const rows = await notion.databases.query({
      database_id: databaseId,
      page_size: 100
    });

    if (rows.results.length === 0) {
      return `\n\n### 📊 ${title}\n\n*Tidak ada data dalam tabel ini.*\n\n`;
    }

    const firstRow: any = rows.results[0];
    const props = firstRow.properties;
    const rawColumns = Object.keys(props).filter(k => {
      const lower = k.toLowerCase().trim();
      if (lower === 'period' || lower === 'periode' || lower === 'number' || lower === 'no') return false;
      return true;
    });

    // Sort Name/Title first
    const titleCol = rawColumns.find(c => props[c]?.type === 'title') || rawColumns[0];
    const otherCols = rawColumns.filter(c => c !== titleCol);
    const columns = [titleCol, ...otherCols, 'Created Time'];

    let tableMd = `\n\n### 📊 ${title}\n\n`;
    tableMd += '| ' + columns.join(' | ') + ' |\n';
    tableMd += '| ' + columns.map(() => '---').join(' | ') + ' |\n';

    for (const row of rows.results as any[]) {
      const p = row.properties;
      const cellValues: string[] = [];

      for (const col of columns) {
        if (col === 'Created Time') {
          if (row.created_time) {
            const d = new Date(row.created_time);
            cellValues.push(d.toISOString().substring(0, 10));
          } else {
            cellValues.push('-');
          }
          continue;
        }

        const prop = p[col];
        if (!prop) {
          cellValues.push('-');
          continue;
        }

        try {
          if (prop.type === 'title') {
            cellValues.push(richTextToMd(prop.title) || '-');
          } else if (prop.type === 'rich_text') {
            cellValues.push(richTextToMd(prop.rich_text) || '-');
          } else if (prop.type === 'select') {
            cellValues.push(prop.select?.name || '-');
          } else if (prop.type === 'multi_select') {
            cellValues.push(prop.multi_select?.map((s: any) => s.name).join(', ') || '-');
          } else if (prop.type === 'status') {
            cellValues.push(prop.status?.name || '-');
          } else if (prop.type === 'date') {
            cellValues.push(prop.date?.start ? (prop.date.end ? `${prop.date.start} s/d ${prop.date.end}` : prop.date.start) : '-');
          } else if (prop.type === 'checkbox') {
            cellValues.push(prop.checkbox ? '✅ Ya' : '❌ Tidak');
          } else if (prop.type === 'number') {
            cellValues.push(String(prop.number ?? '-'));
          } else if (prop.type === 'url') {
            cellValues.push(prop.url ? `[Link](${prop.url})` : '-');
          } else if (prop.type === 'email') {
            cellValues.push(prop.email || '-');
          } else if (prop.type === 'phone_number') {
            cellValues.push(prop.phone_number || '-');
          } else if (prop.type === 'files') {
            if (prop.files && prop.files.length > 0) {
              const fileLinks: string[] = [];
              for (const f of prop.files) {
                const fUrl = f.file?.url || f.external?.url;
                const fName = f.name || 'Dokumen';
                if (fUrl) {
                  const processed = await processAttachment(fUrl, fName);
                  fileLinks.push(`[${processed.fileName}](${processed.driveDownloadUrl})`);
                }
              }
              cellValues.push(fileLinks.join(', ') || '-');
            } else {
              cellValues.push('-');
            }
          } else {
            cellValues.push('-');
          }
        } catch (e) {
          cellValues.push('-');
        }
      }

      tableMd += '| ' + cellValues.map(c => String(c).replace(/\|/g, '\\|').replace(/\n/g, ' • ').trim()).join(' | ') + ' |\n';
    }

    return tableMd;
  } catch (err: any) {
    console.warn(`    ⚠️ Error reading database ${databaseId}:`, err.message);
    return `\n\n### 📊 ${title}\n\n*(Tabel tidak dapat dimuat: ${err.message})*\n\n`;
  }
}

// Convert blocks recursively into Markdown with permanent file handling
async function convertBlocksToMarkdown(blockId: string, depth = 0): Promise<string> {
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
            const childMd = await convertBlocksToMarkdown(b.id, depth + 1);
            parts.push(childMd.split('\n').map(l => l ? `  ${l}` : '').join('\n') + '\n');
          }
        } else if (b.type === 'numbered_list_item') {
          const text = richTextToMd(b.numbered_list_item?.rich_text);
          parts.push(`1. ${text}\n`);
          if (b.has_children) {
            const childMd = await convertBlocksToMarkdown(b.id, depth + 1);
            parts.push(childMd.split('\n').map(l => l ? `  ${l}` : '').join('\n') + '\n');
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
        } else if (b.type === 'file' || b.type === 'pdf') {
          const fileObj = b[b.type];
          const rawUrl = fileObj?.file?.url || fileObj?.external?.url;
          const fileName = fileObj?.name || 'document.pdf';
          if (rawUrl) {
            const processed = await processAttachment(rawUrl, fileName);
            parts.push(`\n\n> 📥 **Dokumen**: [${processed.fileName}](${processed.driveDownloadUrl}) | 👁️ [Lihat di Drive](${processed.driveViewUrl})\n\n`);
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
            const childMd = await convertBlocksToMarkdown(b.id, depth + 1);
            parts.push(childMd);
          }
        } else if (b.type === 'column_list' || b.type === 'column') {
          if (b.has_children) {
            const childMd = await convertBlocksToMarkdown(b.id, depth);
            parts.push(childMd);
          }
        } else if (b.type === 'child_database') {
          const dbTitle = b.child_database?.title || 'Tabel Database';
          const dbMd = await convertDatabaseToMarkdown(b.id, dbTitle);
          parts.push(dbMd);
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

// Master list of pages discovered in the tree
const PAGES_TO_SYNC = [
  { id: '12bd00c5-c809-8006-a5a8-fb55eb68f5d8', title: 'INFORMATION', isRoot: true },
  { id: '12ed00c5-c809-8053-a7bd-cc6b6d5af4be', title: 'INFORMASI IT' },
  { id: '90603168-9c35-481d-abd2-db3f6d2401cd', title: 'HARITA CORE' },
  { id: '5db2aeb0-4bf5-44de-aa1f-b4f57254e31b', title: 'QR CODE' },
  { id: '17bd00c5-c809-8168-8ba3-dbe8e2c5f8cc', title: 'GOLDEN RULES' },
  { id: '21dd00c5-c809-805e-a9e3-f7ba66db1dcf', title: '1. Golden Rules (Keselamatan di jalan tambang)' },
  { id: '21dd00c5-c809-80b2-a396-d5acb416a383', title: '2. Golden Rules (Patuhi Peraturan Rambu-rambu Lalu Lintas)' },
  { id: '21dd00c5-c809-8086-835e-fdea76ef1992', title: '3. Golden Rules (Pekerjaan Berisiko Tinggi)' },
  { id: '223d00c5-c809-8007-8011-e60a4b43fc7c', title: '4. Golden Rules (Isolasi, Lock Out & Zero Energy)' },
  { id: '223d00c5-c809-80a8-9094-d0097330a4fe', title: '5. Golden Rules (Pengankatan dan Penyanggaan)' },
  { id: '223d00c5-c809-80e5-84f8-da359d891708', title: '6. Golden Rules (Bekerja di Area Terbatas)' },
  { id: '223d00c5-c809-807b-a06b-f0d4770a36a3', title: '7.  Golden Rules (Peralatan dan Perlengkapan)' },
  { id: '207d00c5-c809-800c-bf51-ea4e5111bf3f', title: 'MATERI BRIEFING (SAFETY TALK)' },
  { id: '207d00c5-c809-8002-b9fd-dce7e6413ff9', title: 'ENVORMASI COMIC' },
  { id: 'b6b91d56-118d-4acf-a542-64deed757549', title: 'SPDK DAN ATURAN PERUSAHAAN' },
  { id: '223d00c5-c809-80bd-b795-f679ffaa644f', title: 'JOB DESCRIPTION' },
  { id: 'b283d6e6-fcd6-4156-9139-5d2808d44863', title: 'IM IT' },
  { id: 'ca461296-4744-45aa-a425-805960a2f584', title: 'IM HR' },
  { id: 'd9f70ace-bd4b-4ad6-9394-ad5075b8041e', title: 'IM SAFETY' },
  { id: '19fd00c5-c809-8073-acc9-e79b52d2b5a2', title: 'IM Hari Sehat dan Hari Tanpa Tembakau TBP GPS' },
  { id: '235d00c5-c809-80e4-8c30-d0bbf5a97235', title: 'EM QC' },
  { id: '282d00c5-c809-801a-8cf3-d8c59b01557f', title: 'KEBIJAKAN PERUSAHAAN' },
  { id: '26fd00c5-c809-80a2-bf17-f7d21544f477', title: 'INDUKSI INTERNAL' },
  { id: '21ed00c5-c809-804d-b445-f99d1048ee4a', title: 'TRAINING NEED ANALYSIS (TNA)' },
  { id: '2a7d00c5-c809-80c3-9597-e136bbabcb91', title: 'IDENTIFIKASI BAHAYA DAN PENGENDALIAN RESIKO (IBPR)' },
  { id: '2a7d00c5-c809-809c-8082-e618556e8c33', title: 'IDENTIFIKASI ,EVALUASI ASPEK DAN DAMPAK LINGKUNGAN (IADL)' },
  { id: '2a7d00c5-c809-80bf-b69c-cec3c55419ae', title: 'SECURITY RISK ASSESMENT (SRA)' },
  { id: '221d00c5-c809-80fd-bddb-cf10771abb8e', title: 'HASIL MEETING INTERNAL PREP & LAB' },
  { id: 'f9696bbb-95fd-4345-b208-4cf688eb49c3', title: 'ISO 14001' },
  { id: '4c4cc6f5-f7f0-4c36-b23e-8167092d613a', title: 'ISO 45001' }
];

async function syncAll() {
  console.log(`\n======================================================`);
  console.log(`🚀 SINKRONISASI NOTION: INFORMATION MODULE & ATTACHMENTS`);
  console.log(`======================================================\n`);
  console.log(`Total Pages to Process: ${PAGES_TO_SYNC.length}`);

  for (let i = 0; i < PAGES_TO_SYNC.length; i++) {
    const item = PAGES_TO_SYNC[i];
    console.log(`\n[${i + 1}/${PAGES_TO_SYNC.length}] Mengolah: "${item.title}" (${item.id})...`);

    try {
      const pageInfo: any = await notion.pages.retrieve({ page_id: item.id });
      const coverImg = pageInfo.cover?.external?.url || pageInfo.cover?.file?.url || null;

      let cleanTitle = item.title.trim();
      const propTitle = pageInfo.properties?.title?.title?.[0]?.plain_text || pageInfo.properties?.Name?.title?.[0]?.plain_text;
      if (propTitle && propTitle.trim()) {
        cleanTitle = propTitle.trim();
      }

      // Convert all blocks and child databases
      let md = await convertBlocksToMarkdown(item.id);

      // If it's the root INFORMATION page, prepend a structured navigation portal
      if (item.isRoot) {
        let rootHeader = `# 📘 MODUL INFORMASI & DOKUMEN PREP & LAB\n\n`;
        rootHeader += `> **Departemen**: Preparation & Laboratory (PT. TBP & GPS)\n`;
        rootHeader += `> **Status**: Terintegrasi Lengkap dengan Dokumen & Attachment Asli dari Notion\n\n`;
        rootHeader += `---\n\n`;

        rootHeader += `## 🛡️ KESELAMATAN & K3 (HSE)\n`;
        rootHeader += `- ⭐ **[GOLDEN RULES](#)** - Standar Kepatuhan Utama Keselamatan Kerja (Rules 1 s/d 7)\n`;
        rootHeader += `- 📋 **[IDENTIFIKASI BAHAYA DAN PENGENDALIAN RESIKO (IBPR)](#)** - Matriks IBPR Preparation & Lab\n`;
        rootHeader += `- 🌿 **[IDENTIFIKASI & EVALUASI ASPEK DAMPAK LINGKUNGAN (IADL)](#)** - Standar Pengelolaan Lingkungan\n`;
        rootHeader += `- 🔒 **[SECURITY RISK ASSESMENT (SRA)](#)** - SRA & TUSASPRO Dept. Prep & Lab\n`;
        rootHeader += `- 🚨 **[SAFETY FLASH & ALERT](#)** - Notifikasi Kejadian & Peringatan Keselamatan Terkini\n`;
        rootHeader += `- 📢 **[MATERI BRIEFING (SAFETY TALK)](#)** - Materi Presentasi & Topik Pembahasan Safety Harian\n`;
        rootHeader += `- 🩺 **[PROMOSI HEALTH](#)** - Panduan & Edukasi Kesehatan Karyawan\n`;
        rootHeader += `- 🦺 **[PROMOSI K3](#)** - Media Edukasi & Pengingat Bahaya Pertambangan\n`;
        rootHeader += `- 👨‍🏫 **[PROMOSI TRAINER](#)** - Modul Materi Trainer & Kompetensi Kerja\n\n`;

        rootHeader += `## 📜 KEBIJAKAN & ATURAN PERUSAHAAN\n`;
        rootHeader += `- 📝 **[SPDK DAN ATURAN PERUSAHAAN](#)** - Form SPDK Rev03, Etika Digital Medsos, & Slip Gaji\n`;
        rootHeader += `- 🏛️ **[KEBIJAKAN PERUSAHAAN](#)** - Kebijakan Lingkungan 2026, Kebijakan K3, & Kebijakan Keamanan\n`;
        rootHeader += `- 📜 **[ISO 14001](#)** - Sistem Manajemen Lingkungan Terstandar\n`;
        rootHeader += `- 📜 **[ISO 45001](#)** - Sistem Manajemen K3 Internasional\n\n`;

        rootHeader += `## 📑 INTERNAL MEMO (IM) & EDARAN RESMI\n`;
        rootHeader += `- 👥 **[IM HR](#)** - Arsip Lengkap 30+ Memo HR (Cuti, Fingerprint, Ramadhan, Disiplin, dsb.)\n`;
        rootHeader += `- 💻 **[IM IT](#)** - Kebijakan IT (SOP IT, Akses CCTV, Larangan VPN & APK Bajakan)\n`;
        rootHeader += `- ⚠️ **[IM SAFETY](#)** - Ketentuan Fatigue, Dokumentasi Kecelakaan, & Listrik Pribadi\n`;
        rootHeader += `- 🧪 **[EM QC](#)** - Kesepakatan Kadar Ni Supply PT TBP ke PT ONC & PT HPL\n`;
        rootHeader += `- 🚭 **[IM Hari Sehat dan Hari Tanpa Tembakau TBP GPS](#)** - Program Kesehatan Kerja\n\n`;

        rootHeader += `## 🎓 TRAINING & EDUKASI\n`;
        rootHeader += `- 🎓 **[INDUKSI INTERNAL](#)** - Materi Presentasi PPTX Karyawan Baru, Visitor, & Balik Cuti\n`;
        rootHeader += `- 📊 **[TRAINING NEED ANALYSIS (TNA)](#)** - Dokumen Matriks Analisis Kebutuhan Training\n`;
        rootHeader += `- 🎨 **[ENVORMASI COMIC](#)** - Media Komik Edukasi Pengelolaan Lingkungan\n\n`;

        rootHeader += `## 🔬 STANDAR TEKNIS & DOKUMEN LAB\n`;
        rootHeader += `- 📘 **[STANDARD METHODS](#)** - SNI 9339, SNI 9320, SNI 7574, SNI 3488, ISO 17025\n`;
        rootHeader += `- ⚙️ **[MANUAL BOOK INSTRUMENT DAN ALAT](#)** - Manual Book WD-XRF ZETIUM & ED-XRF EPSILON4\n`;
        rootHeader += `- 🧪 **[CRM](#)** - Certified Reference Materials Database\n`;
        rootHeader += `- 🧪 **[INHOUSE](#)** - In-House Standard References\n`;
        rootHeader += `- 💼 **[JOB DESCRIPTION](#)** - Uraian Tugas & Tanggung Jawab Personil\n`;
        rootHeader += `- 🤝 **[HASIL MEETING INTERNAL PREP & LAB](#)** - Rekap Notulensi Pertemuan Koordinasi\n\n`;

        rootHeader += `## 💻 SISTEM, IT & WORKSPACE\n`;
        rootHeader += `- 🖥️ **[INFORMASI IT](#)** - Database Sistem, Akun, & Dukungan IT\n`;
        rootHeader += `- 📱 **[QR CODE](#)** - Direktori QR Code Akses Form & Dokumen Cepat\n`;
        rootHeader += `- 💎 **[HARITA CORE](#)** - Panduan Core Values Harita Ways\n`;
        rootHeader += `- ⏳ **[JOB PENDING](#)** - Daftar Tugas & Pekerjaan Tertunda\n\n`;

        rootHeader += `---\n\n`;
        md = rootHeader + md;
      }

      // Upsert into bulletin_posts
      await db.execute(sql`
        INSERT INTO bulletin_posts (title, notion_id, cover_image, department, category, content, pt, universe, original_created_at)
        VALUES (${cleanTitle}, ${item.id}, ${coverImg}, 'Prep & Lab', 'INFO::1', ${md}, 'TBP', 'TBP_GPS', ${new Date(pageInfo.created_time || Date.now())})
        ON CONFLICT (notion_id) DO UPDATE SET
          title = EXCLUDED.title,
          cover_image = EXCLUDED.cover_image,
          department = EXCLUDED.department,
          category = EXCLUDED.category,
          content = EXCLUDED.content,
          pt = EXCLUDED.pt,
          universe = EXCLUDED.universe;
      `);

      console.log(`  ✓ Berhasil disinkronkan: "${cleanTitle}" (${md.length} karakter)`);
    } catch (err: any) {
      console.error(`  ✗ Gagal sinkron ${item.title}:`, err.message);
    }
  }

  saveCache();
  console.log(`\n🎉 SEMUA DOKUMEN, DATABASE & ATTACHMENT MODUL INFORMATION SELESAI DISINKRONISASIKAN!\n`);
  process.exit(0);
}

syncAll().catch(err => {
  console.error('Fatal synchronization error:', err);
  process.exit(1);
});
