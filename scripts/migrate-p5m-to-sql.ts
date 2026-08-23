import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Client } from '@notionhq/client';
import { db } from '../src/db/index.js';
import { p5mMateri } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

const NOTION_API_KEY = process.env.NOTION_API_KEY || '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';
const NOTION_PAGE_ID = "207d00c5-c809-800c-bf51-ea4e5111bf3f";
const notion = new Client({ auth: NOTION_API_KEY });

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'p5m');

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

async function processPage(page: any, idx: number, total: number) {
  const p = page.properties;
  const name = (p.Name?.title?.[0]?.plain_text || p.Judul?.title?.[0]?.plain_text || "").trim();
  if (!name) return { success: false, reason: 'no-name' };

  const fileUrl = p.File?.files?.[0]?.file?.url || p.File?.files?.[0]?.external?.url || "";
  if (!fileUrl) return { success: false, reason: 'no-file', name };

  const cleanFileName = `p5m_${page.id.replace(/-/g, '')}.png`;
  const localFilePath = path.join(UPLOAD_DIR, cleanFileName);

  // Download if not already cached locally
  if (!fs.existsSync(localFilePath) || fs.statSync(localFilePath).size === 0) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const response = await fetch(fileUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        console.error(`❌ [${idx + 1}/${total}] Gagal download (${response.status}): ${name}`);
        return { success: false, reason: 'fetch-failed', name };
      }
      const arrayBuffer = await response.arrayBuffer();
      fs.writeFileSync(localFilePath, Buffer.from(arrayBuffer));
    } catch (err: any) {
      console.error(`❌ [${idx + 1}/${total}] Timeout/Error download '${name}':`, err.message);
      return { success: false, reason: 'download-error', name };
    }
  }

  const localPublicUrl = `/uploads/p5m/${cleanFileName}`;
  const { kategori, subKategori, divisi } = classifyTopic(name);

  // Save/Upsert directly to PostgreSQL table (p5m_materi)
  const existingDb = await db.select().from(p5mMateri).where(eq(p5mMateri.judul, name)).limit(1);
  if (existingDb.length > 0) {
    await db.update(p5mMateri).set({
      kategori,
      subKategori,
      divisi,
      fileUrl: localPublicUrl,
      notionId: page.id
    }).where(eq(p5mMateri.id, existingDb[0].id));
  } else {
    await db.insert(p5mMateri).values({
      judul: name,
      kategori,
      subKategori,
      divisi,
      fileUrl: localPublicUrl,
      notionId: page.id,
      lastUsed: null
    });
  }

  console.log(`✅ [${idx + 1}/${total}] SQL OK: ${name} -> ${localPublicUrl}`);
  return { success: true, name };
}

async function main() {
  console.log('🚀 Memulai migrasi materi & flyer dari Notion ke SQL...');

  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  const blocks = await notion.blocks.children.list({ block_id: NOTION_PAGE_ID });
  const dbBlock = blocks.results.find((b: any) => b.type === "child_database");
  if (!dbBlock) throw new Error("Child database not found on Notion page");

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

  console.log(`📑 Ditemukan ${allPages.length} item di Notion. Mengunduh secara paralel (batch 10)...`);

  const BATCH_SIZE = 10;
  let successCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < allPages.length; i += BATCH_SIZE) {
    const batch = allPages.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map((page, bIdx) => processPage(page, i + bIdx, allPages.length))
    );
    for (const r of results) {
      if (r.success) successCount++;
      else skippedCount++;
    }
  }

  console.log(`\n🎉 Migrasi P5M ke SQL Selesai!`);
  console.log(`✅ Total berhasil disimpan di SQL: ${successCount} materi`);
  console.log(`⚠️ Dilewati / Gagal: ${skippedCount}`);
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
