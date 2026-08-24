import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { db } from '../src/db/index';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';
dotenv.config();

const token = process.env.NOTION_API_KEY;
console.log('Using Notion API Key:', token?.substring(0, 12) + '...');

const notion = new Client({ auth: token });
const n2m = new NotionToMarkdown({ notionClient: notion });

n2m.setCustomTransformer('child_page', async (block: any) => {
  if (block.child_page?.title) {
    return `\n\n📄 **[Sub-Halaman: ${block.child_page.title}]**\n\n`;
  }
  return '';
});

n2m.setCustomTransformer('child_database', async () => {
  return '';
});

async function getPageMarkdown(pageId: string): Promise<string> {
  try {
    const mdblocks = await n2m.pageToMarkdown(pageId);
    let md = n2m.toMarkdownString(mdblocks).parent || '';

    // Check for child databases inside this page to render their rows into structured markdown tables
    try {
      const blocks = await notion.blocks.children.list({ block_id: pageId, page_size: 100 });
      const dbBlocks = blocks.results.filter((b: any) => b.type === 'child_database');

      for (const dbBlock of dbBlocks as any[]) {
        const dbTitle = dbBlock.child_database?.title || 'Tabel Data';
        console.log(`    Extracting DB table: "${dbTitle}" (${dbBlock.id})`);

        try {
          const rows = await notion.databases.query({
            database_id: dbBlock.id,
            page_size: 100
          });

          if (rows.results.length > 0) {
            const firstRow: any = rows.results[0];
            const props = firstRow.properties;
            const rawColumns = Object.keys(props).filter(k => {
              const t = props[k]?.type;
              const lower = k.toLowerCase().trim();
              if (lower === 'period' || lower === 'periode' || lower === 'number' || lower === 'no') return false;
              return ['title', 'rich_text', 'select', 'multi_select', 'date', 'checkbox', 'number', 'status', 'people', 'url', 'email', 'phone_number'].includes(t);
            });

            // Include Created Time column
            const columns = [...rawColumns, 'Created Time'];

            let tableMd = `\n\n### 📊 ${dbTitle}\n\n`;
            tableMd += '| ' + columns.join(' | ') + ' |\n';
            tableMd += '| ' + columns.map(() => '---').join(' | ') + ' |\n';

            for (const row of rows.results as any[]) {
              const p = row.properties;
              const cells = columns.map(col => {
                if (col === 'Created Time') {
                  if (row.created_time) {
                    const d = new Date(row.created_time);
                    if (!isNaN(d.getTime())) {
                      const y = d.getFullYear();
                      const m = String(d.getMonth() + 1).padStart(2, '0');
                      const day = String(d.getDate()).padStart(2, '0');
                      const h = String(d.getHours()).padStart(2, '0');
                      const min = String(d.getMinutes()).padStart(2, '0');
                      return `${y}-${m}-${day} ${h}:${min}`;
                    }
                  }
                  return '-';
                }

                const prop = p[col];
                if (!prop) return '-';
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
                } catch(e) {
                  return '-';
                }
                return '-';
              });

              tableMd += '| ' + cells.map(c => String(c).replace(/\|/g, '\\|').replace(/\n/g, ' • ').trim()).join(' | ') + ' |\n';
            }

            md += tableMd;
          }
        } catch (err: any) {
          console.error(`    Error querying database ${dbBlock.id}:`, err.message);
        }
      }
    } catch (e: any) {}

    return md.trim();
  } catch (e: any) {
    console.error(`Error converting page ${pageId} to markdown:`, e.message);
    return '';
  }
}

const targetPages = [
  { id: 'c2d1e706-b6fa-433e-aa2e-032597c28b74', title: 'MANAJEMEN MUTU', isRoot: true },
  { id: '12ad00c5-c809-810f-a16d-d430eb9cff32', title: 'Non Routine Manajemen Mutu' },
  { id: '12ad00c5-c809-81cf-b823-f8a54c7f361d', title: 'Daily Manajemen Mutu' },
  { id: '12ad00c5-c809-8121-a681-e4267474e695', title: 'Weekly Manajemen Mutu' },
  { id: '12ad00c5-c809-8145-8159-ff406cda69b4', title: 'Monthly Manajemen Mutu' },
  { id: 'b4018efd-1d7a-4ea8-beba-f09e74529eae', title: 'Quarterly Manajemen Mutu' },
  { id: '12ad00c5-c809-81b0-8ad1-ed4ce619abe9', title: 'Biannual Manajemen Mutu' },
  { id: '12ad00c5-c809-81d8-86ce-fd51c2f7948d', title: 'Yearly Manajemen Mutu' },
  { id: '198d00c5-c809-80cd-957e-c7f854a2f693', title: 'Information Manajemen Mutu' },
  { id: '19ad00c5-c809-80a3-9090-ff6a8234ec79', title: 'Monthly Report' },
  { id: '12cd00c5-c809-80a8-8b94-d39e52a218fa', title: 'Audit ISO 45001' },
  { id: '12cd00c5-c809-80a8-9d83-dff8bcdc226a', title: 'Audit ISO 14001' },
  { id: '231d00c5-c809-8017-84a0-c9cc155fb6d3', title: 'Rules Alat Baru' },
  { id: '2abd00c5-c809-805c-b62e-d379e7a5a823', title: 'Rules Kalibrasi & Uji Riksa' },
  { id: '268d00c5-c809-800f-9f22-edeefa310e1c', title: 'Rules Perizinan XRF' },
  { id: '1f2d00c5-c809-801a-b2a6-e731c730b92f', title: 'Zoom meeting dengan Rumah Mutu Indonesia' }
];

async function syncAll() {
  console.log(`Starting synchronization of ${targetPages.length} Manajemen Mutu pages...`);

  // First check if any target page has sub-children
  const allToSync: { id: string; title: string }[] = [...targetPages];

  for (const pageItem of targetPages) {
    try {
      const blocks = await notion.blocks.children.list({ block_id: pageItem.id, page_size: 50 });
      for (const b of blocks.results as any[]) {
        if (b.type === 'child_page' && b.child_page?.title) {
          if (!allToSync.some(p => p.id === b.id)) {
            console.log(`  Discovered nested sub-page: "${b.child_page.title}" (${b.id}) under ${pageItem.title}`);
            allToSync.push({ id: b.id, title: b.child_page.title });
          }
        }
      }
    } catch (e: any) {}
  }

  console.log(`\nTotal items to process: ${allToSync.length}`);

  for (let i = 0; i < allToSync.length; i++) {
    const item = allToSync[i];
    console.log(`\n[${i + 1}/${allToSync.length}] Processing "${item.title}" (${item.id})...`);

    try {
      const pageInfo: any = await notion.pages.retrieve({ page_id: item.id });
      const coverImg = pageInfo.cover?.external?.url || pageInfo.cover?.file?.url || null;
      let md = await getPageMarkdown(item.id);

      let cleanTitle = item.title.trim();
      if (!cleanTitle || cleanTitle === 'Sub-halaman') {
        cleanTitle = pageInfo.properties?.title?.title?.[0]?.plain_text || pageInfo.properties?.Name?.title?.[0]?.plain_text || 'Dokumen Manajemen Mutu';
      }

      // If it is the root page, add rich navigation links to all its sub-pages and sections
      if (item.id === 'c2d1e706-b6fa-433e-aa2e-032597c28b74') {
        let enhancedHeader = `# 🚀 MANAJEMEN MUTU\n\n`;
        enhancedHeader += `> **Departemen**: Preparation & Laboratory (PT. TBP & GPS)\n\n`;
        enhancedHeader += `## 📋 INFO & RUTINITAS\n`;
        enhancedHeader += `- 🔹 **[Non Routine Manajemen Mutu](#)** - Jadwal & Penanganan Non Routine\n`;
        enhancedHeader += `- 🔹 **[Daily Manajemen Mutu](#)** - Checklist & Pemantauan Mutu Harian\n`;
        enhancedHeader += `- 🔹 **[Weekly Manajemen Mutu](#)** - Rekap & Evaluasi Mutu Mingguan\n`;
        enhancedHeader += `- 🔹 **[Monthly Manajemen Mutu](#)** - Laporan & Review Mutu Bulanan\n`;
        enhancedHeader += `- 🔹 **[Quarterly Manajemen Mutu](#)** - Evaluasi Mutu Triwulan\n`;
        enhancedHeader += `- 🔹 **[Biannual Manajemen Mutu](#)** - Evaluasi Mutu Semesteran\n`;
        enhancedHeader += `- 🔹 **[Yearly Manajemen Mutu](#)** - Audit & Review Mutu Tahunan\n`;
        enhancedHeader += `- 🗂️ **[Information Manajemen Mutu](#)** - Dokumen, Manual, & Kebijakan Mutu\n`;
        enhancedHeader += `- 📗 **[Monthly Report](#)** - Rekapitulasi Laporan Bulanan\n\n`;

        enhancedHeader += `## ⏳ RULES & KEPATUHAN STANDAR\n`;
        enhancedHeader += `- 📜 **[Audit ISO 45001](#)** - Sistem Manajemen K3\n`;
        enhancedHeader += `- 📜 **[Audit ISO 14001](#)** - Sistem Manajemen Lingkungan\n`;
        enhancedHeader += `- ⚙️ **[Rules Alat Baru](#)** - Prosedur Pengadaan & Verifikasi Alat Baru\n`;
        enhancedHeader += `- ⚖️ **[Rules Kalibrasi & Uji Riksa](#)** - Standar Kalibrasi dan Uji Riksa Alat\n`;
        enhancedHeader += `- ☢️ **[Rules Perizinan XRF](#)** - Kepatuhan Keselamatan Radiasi & Izin BAPETEN\n\n`;

        enhancedHeader += `## 🌟 HARITA CORE VALUE\n`;
        enhancedHeader += `*Humble, Agile, Resilient, Integrity, Transparency, Accountability*\n\n`;
        enhancedHeader += `---\n\n`;

        md = enhancedHeader + md;
      }

      await db.execute(sql`
        INSERT INTO bulletin_posts (title, notion_id, cover_image, department, category, content, pt, universe, original_created_at)
        VALUES (${cleanTitle}, ${item.id}, ${coverImg}, 'Prep & Lab', 'MANAJEMEN MUTU', ${md}, 'TBP', 'TBP_GPS', ${new Date(pageInfo.created_time)})
        ON CONFLICT (notion_id) DO UPDATE SET
          title = EXCLUDED.title,
          cover_image = EXCLUDED.cover_image,
          department = EXCLUDED.department,
          category = EXCLUDED.category,
          content = EXCLUDED.content,
          pt = EXCLUDED.pt,
          universe = EXCLUDED.universe;
      `);

      console.log(`  ✓ Synced "${cleanTitle}" (Length: ${md.length} chars)`);
    } catch (e: any) {
      console.error(`  ✗ Error syncing ${item.title}:`, e.message);
    }
  }

  console.log('\n🎉 SINKRONISASI MANAJEMEN MUTU SELESAI!');
  process.exit(0);
}

syncAll().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
