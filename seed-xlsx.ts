import { db } from './src/db/index.js';
import { questions } from './src/db/schema.js';
import * as xlsx from 'xlsx';

async function seed() {
  const file = await import('node:fs/promises').then(fs => fs.readFile('db.xlsx'));
  const workbook = xlsx.read(file);
  const sheet = workbook.Sheets['Master_Pertanyaan'];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log(`Found ${data.length} rows in Master_Pertanyaan`);
  
  await db.delete(questions);
  console.log("Deleted old questions");
  
  const toInsert = data.map((row: any) => {
    return {
      idForm: row[0] ? String(row[0]) : '',
      judulForm: row[1] ? String(row[1]) : '',
      kategori: row[2] ? String(row[2]) : '',
      tipeInput: row[3] ? String(row[3]) : '',
      item: row[4] ? String(row[4]) : '',
      info1: row[5] ? String(row[5]) : '',
      info2: row[6] ? String(row[6]) : '',
      info3: row[7] ? String(row[7]) : '',
      info4: row[8] ? String(row[8]) : '',
    };
  }).filter((row: any) => row.idForm !== '' && row.idForm !== 'ID_Inspeksi');

  console.log(`Prepared ${toInsert.length} valid rows to insert.`);
  
  if (toInsert.length > 0) {
    const chunkSize = 100;
    for (let i = 0; i < toInsert.length; i += chunkSize) {
      await db.insert(questions).values(toInsert.slice(i, i + chunkSize));
    }
    console.log("Seeded successfully");
  }
}
seed().catch(console.error).finally(() => process.exit(0));
