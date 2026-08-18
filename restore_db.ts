import { db } from './src/db/index.js';
import * as schema from './src/db/schema.js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

const BATCH_SIZE = 500;

async function chunkArray<T>(array: T[], size: number): Promise<T[][]> {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;

function reviveDates(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    if (isoDateRegex.test(obj)) {
      return new Date(obj);
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(reviveDates);
  }
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      newObj[key] = reviveDates(obj[key]);
    }
    return newObj;
  }
  return obj;
}

async function restore() {
  console.log('Memulai restore database (chunked)...');
  
  if (!fs.existsSync('db_backups')) {
    console.error('Folder db_backups tidak ditemukan!');
    process.exit(1);
  }
  
  const files = fs.readdirSync('db_backups').filter(f => f.endsWith('.json'));
  
  const tablesOrder = [
    'users', 'employees', 'equipments', 'workOrders', 'tickets', 
    'downtime', 'spareparts', 'apdSettings', 'apdHistory', 'apdDocuments', 
    'roster', 'inspections', 'pemantauan', 'questions', 'agendaEvents', 
    'privateNotes', 'userThemes', 'bulletinPosts', 'notifications', 
    'bulletinComments', 'uploadedFiles', 'appSettings', 'pelanggaran', 'mealReports'
  ];

  files.sort((a, b) => {
    const tableA = a.split('_')[1];
    const tableB = b.split('_')[1];
    if (tableA !== tableB) {
      return tablesOrder.indexOf(tableA) - tablesOrder.indexOf(tableB);
    }
    const chunkA = parseInt(a.split('_')[2].split('.')[0], 10);
    const chunkB = parseInt(b.split('_')[2].split('.')[0], 10);
    return chunkA - chunkB;
  });

  for (const file of files) {
    try {
      const rawData = fs.readFileSync(`db_backups/${file}`, 'utf8');
      const backupData = JSON.parse(rawData);
      const tableName = backupData.table;
      let data = backupData.data;

      // Konversi string ISO Date kembali menjadi object Date
      data = reviveDates(data);

      const table = (schema as any)[tableName];
      if (table && data && data.length > 0) {
        console.log(`- Restore dari ${file} (${tableName}): ${data.length} baris...`);
        const chunks = await chunkArray(data, BATCH_SIZE);
        let inserted = 0;
        
        for (const chunk of chunks) {
          await db.insert(table).values(chunk).onConflictDoNothing();
          inserted += chunk.length;
          console.log(`  Memasukkan ${inserted}/${data.length}...`);
        }
      }
    } catch (e: any) {
      console.error(`  Gagal restore file ${file}:`, e.message);
    }
  }
  
  console.log('Restore selesai!');
  process.exit(0);
}

restore();
