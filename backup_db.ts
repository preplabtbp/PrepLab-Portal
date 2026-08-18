import { db } from './src/db/index.js';
import * as schema from './src/db/schema.js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

const BATCH_SIZE = 5000; // Pisah per 5000 baris

const tables = [
  'users', 'employees', 'equipments', 'workOrders', 'tickets', 
  'downtime', 'spareparts', 'apdSettings', 'apdHistory', 'apdDocuments', 
  'roster', 'inspections', 'pemantauan', 'questions', 'agendaEvents', 
  'privateNotes', 'userThemes', 'bulletinPosts', 'notifications', 
  'bulletinComments', 'uploadedFiles', 'appSettings', 'pelanggaran', 'mealReports'
];

if (!fs.existsSync('db_backups')) {
  fs.mkdirSync('db_backups');
}

async function backup() {
  console.log('Memulai backup database (chunked)...');
  
  for (const tableName of tables) {
    try {
      const table = (schema as any)[tableName];
      if (table) {
        const data = await db.select().from(table);
        if (data.length === 0) continue;
        
        let chunkIndex = 1;
        for (let i = 0; i < data.length; i += BATCH_SIZE) {
          const chunk = data.slice(i, i + BATCH_SIZE);
          const fileName = `db_backups/backup_${tableName}_${chunkIndex}.json`;
          fs.writeFileSync(fileName, JSON.stringify({ table: tableName, data: chunk }, null, 2));
          console.log(`- Backup tabel ${tableName} chunk ${chunkIndex}: ${chunk.length} baris -> ${fileName}`);
          chunkIndex++;
        }
      }
    } catch (e: any) {
      console.error(`Gagal backup tabel ${tableName}:`, e.message);
    }
  }
  
  console.log('Backup selesai! Data disimpan di folder db_backups/');
  process.exit(0);
}

backup();
