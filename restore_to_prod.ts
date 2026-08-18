import * as dotenv from 'dotenv';
dotenv.config();

process.env.SQL_DB_NAME = 'cloud_sql_production_database';
process.env.SQL_USER = process.env.SQL_ADMIN_USER;
process.env.SQL_PASSWORD = process.env.SQL_ADMIN_PASSWORD;

import { db, pool } from './src/db/index.js';
import * as schema from './src/db/schema.js';
import * as fs from 'fs';

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
  console.log('Memulai restore ke cloud_sql_production_database (chunked)...');
  
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

  for (const tableName of tablesOrder) {
    const tableFiles = files.filter(f => f.startsWith(`backup_${tableName}_`));
    
    // Sort correctly by chunk index
    tableFiles.sort((a, b) => {
      const idxA = parseInt(a.replace(`backup_${tableName}_`, '').replace('.json', ''));
      const idxB = parseInt(b.replace(`backup_${tableName}_`, '').replace('.json', ''));
      return idxA - idxB;
    });

    for (const file of tableFiles) {
      try {
        const content = fs.readFileSync(`db_backups/${file}`, 'utf-8');
        const parsed = JSON.parse(content);
        const data = reviveDates(parsed.data);
        const table = (schema as any)[tableName];

        if (table && data && data.length > 0) {
          console.log(`- Restore ${file}: ${data.length} baris...`);
          const chunks = await chunkArray(data, BATCH_SIZE);
          
          let c = 1;
          for (const chunk of chunks) {
            try {
              // Ignore conflicts during restore
              await db.insert(table).values(chunk).onConflictDoNothing();
              console.log(`  -> Chunk ${c}/${chunks.length} berhasil`);
            } catch(e: any) {
              console.log(`  -> Chunk ${c} error: ${e.message}`);
            }
            c++;
          }
        }
      } catch (e: any) {
        console.error(`Gagal restore file ${file}:`, e.message);
      }
    }
  }
  
  console.log('Restore selesai!');
  process.exit(0);
}

restore();
