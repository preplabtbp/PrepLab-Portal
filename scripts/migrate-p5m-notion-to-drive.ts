import 'dotenv/config';
import { google } from 'googleapis';
import { Client } from '@notionhq/client';
import { db } from '../src/db/index.js';
import { p5mMateri } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { Readable } from 'stream';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const NOTION_API_KEY = process.env.NOTION_API_KEY || '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';
const NOTION_PAGE_ID = "207d00c5-c809-800c-bf51-ea4e5111bf3f";
const ROOT_FOLDER_ID = '1JJZKj7X1vsNNP5dTWDYJ_-0xYVhU0Bu7'; // Shared Drive root folder

const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
auth.setCredentials({ refresh_token: REFRESH_TOKEN });
const drive = google.drive({ version: 'v3', auth });
const notion = new Client({ auth: NOTION_API_KEY });

function classifyTopic(title: string) {
  const t = title.toLowerCase();

  // Non-Teknis topics
  if (
    t.includes("ramadhan") || t.includes("puasa") || t.includes("insomnia") ||
    t.includes("diare") || t.includes("osteoporosis") || t.includes("dehidrasi") ||
    t.includes("hiv") || t.includes("gula") || t.includes("batuk") || t.includes("gigi") ||
    t.includes("hipertensi") || t.includes("jantung") || t.includes("makan") ||
    t.includes("dyspepsia") || t.includes("mcu") || t.includes("tembakau") ||
    t.includes("mental") || t.includes("scabies") || t.includes("pancaroba") ||
    t.includes("nipah") || t.includes("faringitis") || t.includes("flu") ||
    t.includes("sengatan panas") || t.includes("gadget") || t.includes("bercanda") ||
    t.includes("izin & sakit") || t.includes("cuti") || t.includes("spdk") ||
    t.includes("headset") || t.includes("disiplin kerja") || t.includes("cuci sepatu") ||
    t.includes("alat makan")
  ) {
    return { kategori: "Non-Teknis", subKategori: "General", divisi: "All" };
  }

  // Teknis Preparation
  if (
    t.includes("preparasi") || t.includes("prep") || t.includes("jaw crusher") ||
    t.includes("pulverizer") || t.includes("cup mill") || t.includes("drying") ||
    t.includes("moisture") || t.includes("quartering") || t.includes("splitting") ||
    t.includes("ayakan") || t.includes("sieving") || t.includes("artco") ||
    t.includes("kering") || t.includes("basah")
  ) {
    return { kategori: "Teknis", subKategori: "Preparation", divisi: "Preparation" };
  }

  // Teknis Laboratory
  if (
    t.includes("lab") || t.includes("laboratorium") || t.includes("xrf") ||
    t.includes("aas") || t.includes("titrasi") || t.includes("reagen") ||
    t.includes("buret") || t.includes("pipet") || t.includes("lemari asam") ||
    t.includes("asam") || t.includes("press/timbang") || t.includes("analitik") ||
    t.includes("kalibrasi") || t.includes("crm") || t.includes("standar baku") ||
    t.includes("quality") || t.includes("qa") || t.includes("qc")
  ) {
    return { kategori: "Teknis", subKategori: "Laboratory", divisi: "Laboratory" };
  }

  // Teknis Maintenance
  if (
    t.includes("maintenance") || t.includes("perawatan") || t.includes("lubrikasi") ||
    t.includes("genset") || t.includes("kompresor") || t.includes("loto") ||
    t.includes("kegagalan rem") || t.includes("alat berat") || t.includes("dashcam") ||
    t.includes("parkir") || t.includes("unit") || t.includes("driving") || t.includes("blind spot")
  ) {
    return { kategori: "Teknis", subKategori: "Maintenance", divisi: "Maintenance" };
  }

  // Teknis General
  return { kategori: "Teknis", subKategori: "General", divisi: "All" };
}

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

async function main() {
  console.log('🚀 Memulai migrasi materi & flyer dari Notion ke SQL & Google Drive...');

  const targetFolderId = await getOrCreateP5MFolder();
  console.log('📁 Google Drive Target Folder ID:', targetFolderId);

  // 1. Fetch all rows from Notion database
  const blocks = await notion.blocks.children.list({ block_id: NOTION_PAGE_ID });
  const dbBlock = blocks.results.find((b: any) => b.type === "child_database");
  if (!dbBlock) {
    throw new Error("Child database not found on Notion page");
  }

  let hasMore = true;
  let startCursor: string | undefined = undefined;
  const allPages: any[] = [];

  while (hasMore) {
    const res: any = await notion.databases.query({
      database_id: dbBlock.id,
      start_cursor: startCursor,
      page_size: 100
    });
    allPages.push(...res.results);
    hasMore = res.has_more;
    startCursor = res.next_cursor;
  }

  console.log(`📑 Ditemukan ${allPages.length} item dari database Notion.`);

  let migratedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < allPages.length; i++) {
    const page = allPages[i];
    const p = page.properties;
    const name = (p.Name?.title?.[0]?.plain_text || p.Judul?.title?.[0]?.plain_text || "").trim();
    if (!name) {
      skippedCount++;
      continue;
    }

    const fileUrl = p.File?.files?.[0]?.file?.url || p.File?.files?.[0]?.external?.url || "";
    if (!fileUrl) {
      console.log(`[${i + 1}/${allPages.length}] ⚠️ Lewati '${name}' (Tidak ada file/flyer).`);
      skippedCount++;
      continue;
    }

    console.log(`[${i + 1}/${allPages.length}] 📥 Mengunduh flyer untuk '${name}'...`);
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) {
        console.error(`❌ Gagal download dari Notion (${response.status}): ${name}`);
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get('content-type') || 'image/png';
      const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';
      const cleanFileName = `P5M_${name.replace(/[^a-zA-Z0-9_-]/g, '_')}.${ext}`;

      // Upload to Google Drive
      const media = {
        mimeType: contentType,
        body: Readable.from(buffer)
      };

      // Check if file with same name already exists in Drive folder
      const existingFileRes = await drive.files.list({
        q: `name='${cleanFileName}' and '${targetFolderId}' in parents and trashed=false`,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });

      let driveFileId = '';
      if (existingFileRes.data.files && existingFileRes.data.files.length > 0) {
        driveFileId = existingFileRes.data.files[0].id!;
        console.log(`   🔁 File sudah ada di Drive ID: ${driveFileId}`);
      } else {
        const driveUploadRes = await drive.files.create({
          requestBody: {
            name: cleanFileName,
            parents: [targetFolderId]
          },
          media: media,
          fields: 'id, webViewLink',
          supportsAllDrives: true
        });
        driveFileId = driveUploadRes.data.id!;
        console.log(`   ✅ Berhasil upload ke Drive ID: ${driveFileId}`);

        // Set permission public/read so everyone can view the flyer
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
          // Ignore if permission already inherited
        }
      }

      // Permanent Google Drive image URL (works natively with image tags and downloads)
      const driveDirectUrl = `https://lh3.googleusercontent.com/d/${driveFileId}`;

      const { kategori, subKategori, divisi } = classifyTopic(name);

      // Save/Upsert directly to Postgres database (p5m_materi)
      const existingDb = await db.select().from(p5mMateri).where(eq(p5mMateri.judul, name)).limit(1);
      if (existingDb.length > 0) {
        await db.update(p5mMateri).set({
          kategori,
          subKategori,
          divisi,
          fileUrl: driveDirectUrl,
          notionId: page.id
        }).where(eq(p5mMateri.id, existingDb[0].id));
      } else {
        await db.insert(p5mMateri).values({
          judul: name,
          kategori,
          subKategori,
          divisi,
          fileUrl: driveDirectUrl,
          notionId: page.id,
          lastUsed: null
        });
      }

      migratedCount++;
    } catch (err: any) {
      console.error(`❌ Error migrating '${name}':`, err.message);
    }
  }

  console.log(`\n🎉 Migrasi Selesai!`);
  console.log(`✅ Berhasil dimigrasikan ke SQL & Drive: ${migratedCount} materi`);
  console.log(`⚠️ Dilewati: ${skippedCount}`);
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error in migration:', err);
  process.exit(1);
});
