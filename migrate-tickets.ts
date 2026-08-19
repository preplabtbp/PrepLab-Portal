import { parse } from 'csv-parse/sync';
import { db } from './src/db/index.js';
import { tickets } from './src/db/schema.js';

async function migrate() {
  try {
    console.log("Fetching CSV from Google Sheets (Rekap_Temuan)...");
    const res = await fetch("https://docs.google.com/spreadsheets/d/1wk0bXvmbZHZOjTTGDy-5oQrFZJmFjJ1c/gviz/tq?tqx=out:csv&sheet=Rekap_Temuan");
    const csvData = await res.text();
    
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true
    });

    console.log(`Found ${records.length} records. First row keys:`, Object.keys(records[0] || {}));
    
    const values = records.filter((r: any) => r['Timestamp'] || r['Lokasi / Mesin / Alat Berat']).map((r: any, idx: number) => {
      const dateStr = r['Timestamp'];
      let date = dateStr ? new Date(dateStr.replace(/"/g, '')) : new Date();
      if (isNaN(date.getTime())) date = new Date(); // Fallback

      return {
        ticketId: `TKT-LEGACY-${Date.now()}-${idx}`,
        date: date,
        requestorName: r['Inspector Utama (1)'] || r['Inspektor'] || 'Inspector',
        category: r['Jenis Form'] || 'Inspeksi',
        location: r['Lokasi / Mesin / Alat Berat'] || 'Area',
        description: r['Temuan (Unsafe Condition / Action)'] || r['Temuan'] || 'Temuan',
        risk: r['Tingkat Risiko (H/M/L)'] || null,
        initialControl: r['Tindakan Perbaikan Sementara'] || r['Tindak Lanjut'] || null,
        status: r['Status Tiket'] === 'CLOSED' ? 'CLOSED' : 'OPEN',
        priority: r['Prioritas (H/M/L)'] || 'Medium',
        photoUrl: r['Foto Bukti (G-Drive Link)'] || null,
        actionTaken: r['Keterangan Penutupan Tiket'] || null,
        closingPhoto: r['Bukti Penutupan (G-Drive Link)'] || null,
        pic: r['PIC Perbaikan'] || null,
        completionDate: r['Tanggal Ditutup'] ? new Date(r['Tanggal Ditutup'].replace(/"/g, '')) : null,
        source: 'inspeksi'
      };
    });

    if (values.length > 0) {
      const chunkSize = 100;
      for (let i = 0; i < values.length; i += chunkSize) {
        const chunk = values.slice(i, i + chunkSize);
        await db.insert(tickets).values(chunk).onConflictDoNothing({ target: tickets.ticketId });
        console.log(`Inserted chunk ${i / chunkSize + 1}`);
      }
      
      // Also sync to appdb_staging since we updated appdb
      console.log("Migration to SQL complete. Please run sync-db.js to sync with Staging.");
    }
  } catch(e) {
    console.error("Migration failed:", e);
  }
  process.exit(0);
}

migrate();
