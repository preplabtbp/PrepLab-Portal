import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { db } from '../src/db/index.js';
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

            // Include Created Time column if not already present
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
  { id: '20a269df-d5f1-4c3a-85c6-dea5bdb9e098', title: 'INVENTORY', isRoot: true },
  { id: '12ad00c5-c809-8115-b7f3-fcc6e578f2c2', title: 'Non Routine Inventory' },
  { id: '12ad00c5-c809-81aa-ad9e-ea1ca22c6232', title: 'Daily Inventory' },
  { id: '12ad00c5-c809-8157-905a-fb6dee3d3a40', title: 'Weekly Inventory' },
  { id: '12ad00c5-c809-81db-9b9a-ea29163ee1fc', title: 'Monthly Inventory' },
  { id: '12ad00c5-c809-81e6-87b1-cde6b2176401', title: 'Quarterly Inventory' },
  { id: '12ad00c5-c809-8149-839a-eab0e6417251', title: 'Biannual Inventory' },
  { id: '12ad00c5-c809-813a-b447-e906c75f0d41', title: 'Yearly Inventory' },
  { id: '12bd00c5-c809-80c5-8254-d886df66d9dd', title: 'Monitoring PO TBP' },
  { id: '12bd00c5-c809-809e-9d4e-eb6f91de279c', title: 'Monitoring PO GPS' },
  { id: '12bd00c5-c809-80b2-b82e-c78281b117f1', title: 'Monitoring PO GTS' },
  { id: '12bd00c5-c809-8066-9a80-c8e9b2ace840', title: 'Monitoring PO JMP' },
  { id: '12bd00c5-c809-80fc-a08c-c08f6ab1cdf5', title: 'Kawasi - Monitoring Centralized' },
  { id: '12bd00c5-c809-80e4-acc8-c266564a3493', title: 'Outer - Monitoring Centralized' },
  { id: '14ed00c5-c809-808f-bd1f-e23175fa95a3', title: 'Data Asset' },
  { id: '19cd00c5-c809-80b9-8896-cc0b7e5e71f8', title: 'Scrap' },
  { id: '198d00c5-c809-80ce-a97c-f0f6a2941b66', title: 'Inventory Information' },
  { id: '262d00c5-c809-809c-8368-cc6b40439854', title: 'CARNAVAL TBP GPS' },
  { id: '12cd00c5-c809-804d-b17e-c8d8c05a3191', title: 'Prosedur Pengajuan BA SCRAB (Alat Prep & Lab)' },
  { id: '24dd00c5-c809-800d-8f80-ebb1e960ec6e', title: 'Prosedur Pembuangan Barang SCRAB ( Mandiri )' },
  { id: '12cd00c5-c809-8096-936d-e8937725c146', title: 'Prosedur Pembuatan Nermi' },
  { id: '12cd00c5-c809-809d-9a6f-f22fc392c3cc', title: 'Prosedur Pengajuan UR RAB dan IM' },
  { id: '12cd00c5-c809-8016-a5c3-d07bcff95b52', title: 'Prosedur Order Barang Internal' },
  { id: '12cd00c5-c809-801e-a680-eb7ddf9800e1', title: 'Pengajuan Pengiriman Barang Urgent HO' },
  { id: '12cd00c5-c809-80da-a937-fad3e0520278', title: 'Pengajuan Pengiriman Barang Urgent TTE - Site' },
  { id: '12cd00c5-c809-800a-b3e2-fb843d45fd21', title: 'Prosedur Penerimaan Barang RAB Finance, Logistik, Safety, GA, IT dan Enviro' },
  { id: '380d00c5-c809-80ad-9711-ec92e2934b98', title: 'Prosedur Form Permintaan Penitipan Pengiriman Barang via HMS ( FPPPB )' },
  { id: '380d00c5-c809-803d-b835-db5804a3d4bc', title: 'Prosedur Form Permintaan Pengiriman Barang Urgent via HMS ( FPPBU )' }
];

async function syncAll() {
  console.log(`Starting synchronization of ${targetPages.length} Inventory pages from Notion...`);

  const allToSync: { id: string; title: string; isRoot?: boolean }[] = [...targetPages];

  console.log(`\nTotal items to process: ${allToSync.length}`);

  for (let i = 0; i < allToSync.length; i++) {
    const item = allToSync[i];
    console.log(`\n[${i + 1}/${allToSync.length}] Processing "${item.title}" (${item.id})...`);

    try {
      const pageInfo: any = await notion.pages.retrieve({ page_id: item.id });
      const coverImg = pageInfo.cover?.external?.url || pageInfo.cover?.file?.url || null;
      let md = await getPageMarkdown(item.id);

      let cleanTitle = item.title.trim();
      if (!cleanTitle) {
        cleanTitle = pageInfo.properties?.title?.title?.[0]?.plain_text || pageInfo.properties?.Name?.title?.[0]?.plain_text || 'Dokumen Inventory';
      }

      // If it is the root page, add rich navigation links
      if (item.isRoot) {
        let enhancedHeader = `# 📦 INVENTORY CONTROL\n\n`;
        enhancedHeader += `> **Departemen**: Preparation & Laboratory (PT. TBP & GPS)\n\n`;
        enhancedHeader += `## 📋 INFO & RUTINITAS\n`;
        enhancedHeader += `- 📑 **[Non Routine Inventory](#)** - Aktivitas & Penugasan Non-Rutin\n`;
        enhancedHeader += `- 📐 **[Daily Inventory](#)** - Kontrol Stok & Checklist Harian\n`;
        enhancedHeader += `- 📑 **[Weekly Inventory](#)** - Monitoring Mingguan & Stok Reagen\n`;
        enhancedHeader += `- 📑 **[Monthly Inventory](#)** - Rekapitulasi Stok Bulanan & Opname\n`;
        enhancedHeader += `- 📑 **[Quarterly Inventory](#)** - Evaluasi Stok & Pengadaan Triwulan\n`;
        enhancedHeader += `- 📑 **[Biannual Inventory](#)** - Review Semesteran Kebutuhan Material\n`;
        enhancedHeader += `- 📑 **[Yearly Inventory](#)** - Stock Opname Tahunan & Perencanaan\n`;
        enhancedHeader += `- 📄 **[Inventory Information](#)** - Pusat Informasi & Pedoman Logistik\n\n`;

        enhancedHeader += `## 📦 MONITORING PURCHASE ORDER (PO) & ASSET\n`;
        enhancedHeader += `- 📦 **[Monitoring PO TBP](#)** - Tracking PO Site TBP\n`;
        enhancedHeader += `- 📦 **[Monitoring PO GPS](#)** - Tracking PO Site GPS\n`;
        enhancedHeader += `- 📦 **[Monitoring PO GTS](#)** - Tracking PO Site GTS\n`;
        enhancedHeader += `- 📦 **[Monitoring PO JMP](#)** - Tracking PO Site JMP\n`;
        enhancedHeader += `- 📍 **[Kawasi - Monitoring Centralized](#)** - Pemantauan Centralized Kawasi\n`;
        enhancedHeader += `- 📍 **[Outer - Monitoring Centralized](#)** - Pemantauan Centralized Outer\n`;
        enhancedHeader += `- 📊 **[Data Asset](#)** - Database Inventaris Aset & Peralatan\n`;
        enhancedHeader += `- 🗑️ **[Scrap](#)** - Logbook & Berita Acara Barang Rusak / Scrap\n\n`;

        enhancedHeader += `## 📜 STANDAR OPERASIONAL & PROSEDUR PENGIRIMAN\n`;
        enhancedHeader += `- 📄 **[Prosedur Pengajuan BA SCRAB (Alat Prep & Lab)](#)**\n`;
        enhancedHeader += `- 📄 **[Prosedur Pembuangan Barang SCRAB ( Mandiri )](#)**\n`;
        enhancedHeader += `- 📄 **[Prosedur Pembuatan Nermi](#)**\n`;
        enhancedHeader += `- 📄 **[Prosedur Pengajuan UR RAB dan IM](#)**\n`;
        enhancedHeader += `- 📄 **[Prosedur Order Barang Internal](#)**\n`;
        enhancedHeader += `- 📄 **[Pengajuan Pengiriman Barang Urgent HO](#)**\n`;
        enhancedHeader += `- 📄 **[Pengajuan Pengiriman Barang Urgent TTE - Site](#)**\n`;
        enhancedHeader += `- 📄 **[Prosedur Penerimaan Barang RAB Finance, Logistik, Safety, GA, IT dan Enviro](#)**\n`;
        enhancedHeader += `- 📄 **[Prosedur Form Permintaan Penitipan Pengiriman Barang via HMS ( FPPPB )](#)**\n`;
        enhancedHeader += `- 📄 **[Prosedur Form Permintaan Pengiriman Barang Urgent via HMS ( FPPBU )](#)**\n\n`;

        enhancedHeader += `---\n\n`;
        md = enhancedHeader + md;
      }

      await db.execute(sql`
        INSERT INTO bulletin_posts (title, notion_id, cover_image, department, category, content, pt, universe, original_created_at)
        VALUES (${cleanTitle}, ${item.id}, ${coverImg}, 'Prep & Lab', 'INVENTORY', ${md}, 'TBP', 'TBP_GPS', ${new Date(pageInfo.created_time)})
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

  console.log('\n🎉 SINKRONISASI INVENTORY DARI NOTION SELESAI!');
  process.exit(0);
}

syncAll().catch(err => {
  console.error('Fatal error in syncAll:', err);
  process.exit(1);
});
